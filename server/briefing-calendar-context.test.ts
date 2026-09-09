import assert from 'node:assert/strict';
import { buildCalendarBriefingContext } from './openai';

const referenceDate = new Date('2026-08-27T00:00:00.000Z');
const section = buildCalendarBriefingContext([
  {
    title: 'Team Standup',
    startTime: '2026-08-27T09:00:00.000Z',
    endTime: '2026-08-27T09:30:00.000Z',
    source: 'google',
  },
  {
    title: 'Next Week Planning',
    startTime: '2026-08-31T15:00:00.000Z',
    endTime: '2026-08-31T16:00:00.000Z',
    source: 'manual',
  },
  {
    title: 'Far Future',
    startTime: '2026-09-10T12:00:00.000Z',
    endTime: '2026-09-10T13:00:00.000Z',
    source: 'google',
  },
], referenceDate);

assert.ok(section, 'expected a calendar briefing section');
assert.match(section, /Google Calendar sync \(read-only\)/);
assert.match(section, /Team Standup/);
assert.match(section, /Next Week Planning/);
assert.doesNotMatch(section, /Far Future/);
console.log('calendar briefing context test passed');
