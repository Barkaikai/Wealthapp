import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

let redisAvailable = false;
redis.connect().then(() => {
  redisAvailable = true;
  console.log('[MultiAgent] Redis connected successfully');
}).catch((err) => {
  console.warn('[MultiAgent] Redis connection failed, memory features disabled:', err.message);
});

interface ProviderConfig {
  name: string;
  type: 'openai' | 'anthropic' | 'cohere' | 'generic';
  endpoint?: string;
  key?: string;
  model?: string;
  opts?: any;
  weight?: number;
}

interface ToolConfig {
  name: string;
  args?: Record<string, any>;
}

interface MultiAgentOptions {
  enableCritique?: boolean;
  alwaysRunTools?: boolean;
  memoryTTL?: number;
  timeout?: number;
}

interface ProviderResponse {
  provider: string;
  text: string;
  raw: any;
  score?: number;
  critique?: string | null;
}

async function callOpenAI(messages: any[], opts: any = {}, openai: any) {
  const resp = await openai.chat.completions.create({
    model: opts.model || 'gpt-4o-mini',
    messages,
    max_tokens: opts.max_tokens || 700,
    temperature: opts.temperature ?? 0.2,
  });
  const text = resp.choices?.[0]?.message?.content ?? '';
  return { provider: 'openai', text, raw: resp };
}

async function callGenericProvider(providerConfig: ProviderConfig, prompt: string, opts: any = {}) {
  if (!providerConfig || !providerConfig.type) {
    throw new Error('providerConfig required');
  }

  if (providerConfig.type === 'anthropic') {
    const resp = await axios.post(
      providerConfig.endpoint!,
      {
        model: providerConfig.model,
        prompt,
        max_tokens: opts.max_tokens || 700,
        temperature: opts.temperature ?? 0.2,
      },
      {
        headers: { Authorization: `Bearer ${providerConfig.key}` },
        timeout: opts.timeout || 8000,
      }
    );
    return {
      provider: providerConfig.name,
      text: resp.data?.completion ?? resp.data?.result ?? '',
      raw: resp.data,
    };
  }

  if (providerConfig.type === 'cohere') {
    const resp = await axios.post(
      providerConfig.endpoint!,
      {
        model: providerConfig.model,
        prompt,
        max_tokens: opts.max_tokens || 700,
        temperature: opts.temperature ?? 0.2,
      },
      {
        headers: { Authorization: `Bearer ${providerConfig.key}` },
        timeout: opts.timeout || 8000,
      }
    );
    return {
      provider: providerConfig.name,
      text: resp.data?.text ?? '',
      raw: resp.data,
    };
  }

  const resp = await axios.post(
    providerConfig.endpoint!,
    { prompt, ...opts },
    {
      headers: { Authorization: `Bearer ${providerConfig.key}` },
      timeout: opts.timeout || 8000,
    }
  );
  return {
    provider: providerConfig.name,
    text: resp.data?.text ?? JSON.stringify(resp.data),
    raw: resp.data,
  };
}

function scoreResponse(text: string, providerName: string): number {
  let score = Math.max(0, Math.min(1, text.length / 1000));
  const helpfulTerms = ['therefore', 'recommended', 'steps', 'first', 'second', 'in summary', 'analysis', 'strategy'];
  for (const t of helpfulTerms) {
    if (text.toLowerCase().includes(t)) score += 0.1;
  }
  if (providerName === 'openai') score *= 1.05;
  return Math.min(1, score);
}

async function runTool(name: string, args: Record<string, any> = {}): Promise<string> {
  if (name === 'getPortfolioSnapshot') {
    return `Portfolio snapshot: Mock data - integrate with your portfolio API`;
  }
  if (name === 'simpleCalc') {
    try {
      const expr = args.expr as string;
      if (!expr || typeof expr !== 'string') {
        return 'Calculation error: invalid expression';
      }
      const result = Function(`"use strict"; return (${expr})`)();
      return `Result: ${result}`;
    } catch (e: any) {
      return `Calculation error: ${String(e.message)}`;
    }
  }
  return `Unknown tool ${name}`;
}

export async function multiAgentQuery({
  userId,
  prompt,
  context = '',
  providers = [],
  tools = [],
  options = {},
  openai,
}: {
  userId: string;
  prompt: string;
  context?: string;
  providers?: ProviderConfig[];
  tools?: ToolConfig[];
  options?: MultiAgentOptions;
  openai: any;
}): Promise<{
  requestId: string;
  prompt: string;
  context: string;
  best: { provider: string; text: string; score: number; critique: string | null };
  all: ProviderResponse[];
  toolResults: Record<string, string>;
}> {
  const requestId = uuidv4();
  const systemMsg = `You are a helpful AI assistant for a billionaire wealth management platform. Context: ${context}`;

  let memory = '';
  if (redisAvailable && redis.status === 'ready') {
    try {
      const memKey = `mem:${userId}`;
      const memCached = await redis.get(memKey);
      if (memCached) memory = `\n\nShort-term memory: ${memCached}`;
    } catch (e) {
      console.warn('[MultiAgent] Redis read failed:', e);
    }
  }

  const chatMessages = [
    { role: 'system', content: systemMsg + memory },
    { role: 'user', content: prompt },
  ];

  const calls = providers.map(async (prov) => {
    try {
      if (prov.type === 'openai') {
        return await callOpenAI(chatMessages, prov.opts || {}, openai);
      } else {
        const promptText = `${systemMsg}\n\nUser: ${prompt}${memory}`;
        return await callGenericProvider(prov, promptText, prov.opts || {});
      }
    } catch (err: any) {
      return {
        provider: prov.name,
        text: `ERROR from ${prov.name}: ${err.message}`,
        raw: err,
      };
    }
  });

  const responses = await Promise.all(calls);

  const critiques: Array<{ provider: string; critique: string }> = [];
  if (options.enableCritique && openai) {
    for (const r of responses) {
      const critiquePrompt = [
        {
          role: 'system',
          content:
            'You are a critic that scores the helpfulness and correctness of an assistant reply from 0-10 and provides a short reason.',
        },
        {
          role: 'user',
          content: `Original prompt: ${prompt}\n\nProvider reply:\n${r.text}\n\nScore and short reason:`,
        },
      ];
      try {
        const c = await callOpenAI(critiquePrompt, { max_tokens: 200, temperature: 0 }, openai);
        critiques.push({ provider: r.provider, critique: c.text });
      } catch (e: any) {
        critiques.push({ provider: r.provider, critique: `Critique error: ${e.message}` });
      }
    }
  }

  const scored = responses.map((r) => {
    const s = scoreResponse(r.text, r.provider);
    const critiqueObj = critiques.find((c) => c.provider === r.provider);
    let critiqueScore = 0;
    if (critiqueObj && critiqueObj.critique) {
      const m = critiqueObj.critique.match(/(\d{1,2})(?:\/10)?/);
      if (m) critiqueScore = Number(m[1]) / 10;
    }
    const combined = Math.min(1, s * (0.75 + 0.25 * (1 + critiqueScore)));
    return {
      provider: r.provider,
      text: r.text,
      raw: r.raw,
      score: combined,
      critique: critiqueObj?.critique || null,
    };
  });

  const toolResults: Record<string, string> = {};
  for (const t of tools) {
    if (prompt.includes(`[TOOL:${t.name}]`) || options.alwaysRunTools) {
      toolResults[t.name] = await runTool(t.name, t.args || {});
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  if (redisAvailable && redis.status === 'ready') {
    try {
      const memKey = `mem:${userId}`;
      const memCached = await redis.get(memKey);
      const newMem = (memCached ? memCached + '\n' : '') + `Q:${prompt}\nA:${best.text.slice(0, 300)}`;
      await redis.set(memKey, newMem, 'EX', options.memoryTTL || 60 * 60 * 6);
    } catch (e) {
      console.warn('[MultiAgent] Redis write failed:', e);
    }
  }

  return {
    requestId,
    prompt,
    context,
    best: {
      provider: best.provider,
      text: best.text,
      score: best.score,
      critique: best.critique,
    },
    all: scored,
    toolResults,
  };
}

export async function closeRedis() {
  if (redisAvailable) {
    await redis.quit();
  }
}
