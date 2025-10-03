/**
 * Circuit Breaker pattern implementation
 * Prevents cascading failures by tracking failed requests
 * and temporarily blocking calls to failing services
 */

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, blocking requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening circuit
  successThreshold: number;      // Number of successes in half-open to close circuit
  timeout: number;               // Time in ms to wait before trying half-open
  monitoringPeriod: number;      // Time window for counting failures
}

interface CircuitMetrics {
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  nextAttempt: number;
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private metrics: CircuitMetrics = {
    failures: 0,
    successes: 0,
    lastFailureTime: null,
    lastSuccessTime: null,
    nextAttempt: 0,
  };

  constructor(
    private name: string,
    private config: CircuitBreakerConfig = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,           // 1 minute
      monitoringPeriod: 120000, // 2 minutes
    }
  ) {}

  async execute<T>(operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      const now = Date.now();
      
      // Check if it's time to try again (half-open)
      if (now >= this.metrics.nextAttempt) {
        console.log(`[CircuitBreaker:${this.name}] Attempting recovery (half-open)`);
        this.state = CircuitState.HALF_OPEN;
      } else {
        const waitTime = Math.ceil((this.metrics.nextAttempt - now) / 1000);
        console.log(`[CircuitBreaker:${this.name}] Circuit OPEN, retry in ${waitTime}s`);
        
        if (fallback) {
          return await fallback();
        }
        throw new Error(`Circuit breaker OPEN for ${this.name}. Service temporarily unavailable.`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error: any) {
      this.onFailure();
      
      if (fallback) {
        console.log(`[CircuitBreaker:${this.name}] Using fallback`);
        return await fallback();
      }
      
      throw error;
    }
  }

  private onSuccess(): void {
    this.metrics.successes++;
    this.metrics.lastSuccessTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.metrics.successes >= this.config.successThreshold) {
        console.log(`[CircuitBreaker:${this.name}] Service recovered, closing circuit`);
        this.close();
      }
    } else {
      // Reset failure count on success
      this.metrics.failures = 0;
    }
  }

  private onFailure(): void {
    this.metrics.failures++;
    this.metrics.lastFailureTime = Date.now();

    // Clean up old failures outside monitoring period
    if (this.metrics.lastFailureTime && this.metrics.lastSuccessTime) {
      const timeSinceLastSuccess = Date.now() - this.metrics.lastSuccessTime;
      if (timeSinceLastSuccess > this.config.monitoringPeriod) {
        this.metrics.failures = 1; // Reset to current failure only
      }
    }

    if (this.state === CircuitState.HALF_OPEN) {
      console.log(`[CircuitBreaker:${this.name}] Service still failing, reopening circuit`);
      this.open();
    } else if (this.metrics.failures >= this.config.failureThreshold) {
      console.log(`[CircuitBreaker:${this.name}] Failure threshold reached (${this.metrics.failures}/${this.config.failureThreshold}), opening circuit`);
      this.open();
    }
  }

  private open(): void {
    this.state = CircuitState.OPEN;
    this.metrics.nextAttempt = Date.now() + this.config.timeout;
    this.metrics.successes = 0;
  }

  private close(): void {
    this.state = CircuitState.CLOSED;
    this.metrics.failures = 0;
    this.metrics.successes = 0;
  }

  getState(): CircuitState {
    return this.state;
  }

  getMetrics(): Readonly<CircuitMetrics> {
    return { ...this.metrics };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.metrics = {
      failures: 0,
      successes: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      nextAttempt: 0,
    };
    console.log(`[CircuitBreaker:${this.name}] Circuit reset`);
  }
}

// Circuit breaker instances for different services
export const circuitBreakers = {
  openai: new CircuitBreaker('OpenAI', {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 30000,      // 30 seconds
    monitoringPeriod: 60000,
  }),
  alphaVantage: new CircuitBreaker('AlphaVantage', {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,      // 1 minute
    monitoringPeriod: 120000,
  }),
  coinGecko: new CircuitBreaker('CoinGecko', {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,      // 1 minute
    monitoringPeriod: 120000,
  }),
  gmail: new CircuitBreaker('Gmail', {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 45000,      // 45 seconds
    monitoringPeriod: 90000,
  }),
  tavily: new CircuitBreaker('Tavily', {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 30000,      // 30 seconds
    monitoringPeriod: 60000,
  }),
};

// Health check endpoint can query circuit breaker states
export function getCircuitBreakerStatus() {
  return Object.entries(circuitBreakers).map(([name, breaker]) => ({
    service: name,
    state: breaker.getState(),
    metrics: breaker.getMetrics(),
  }));
}
