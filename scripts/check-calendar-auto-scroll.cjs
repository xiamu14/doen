const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { proxy, subscribe } = require('valtio/vanilla');
const source = fs.readFileSync('src/components/task/task-calendar.tsx', 'utf8');
const start = source.indexOf('  useEffect(() => {\n    let wasOpen');
const end = source.indexOf('\n\n  return (', start);
assert.ok(start >= 0 && end > start);
let now = new Date(2026, 10, 12, 10).getTime();
let interval, visibility;
let scrolls = 0, updates = 0;
const cleanups = [];
const state = proxy({ activeModalId: null });
const context = {
  modalsState: state, subscribe,
  resumeAutoScrollAt: { current: 0 }, lastAutoScroll: { current: now },
  Date: class extends Date {
    constructor() { super(now); }
    static now() { return now; }
  },
  useEffect: (effect) => cleanups.push(effect()),
  dates: [{ date: 'today' }], dayjs: () => ({ format: () => 'today' }),
  calendarTimeUpdates: { publish() { updates++; } },
  scrollToCurrentTime() { scrolls++; },
  window: { setInterval(fn) { interval = fn; }, clearInterval() { interval = undefined; } },
  document: {
    visibilityState: 'visible',
    addEventListener(_, fn) { visibility = fn; },
    removeEventListener() { visibility = undefined; },
  },
};
vm.runInNewContext(source.slice(start, end), context);
assert.equal(scrolls, 1, 'initial scroll remains');
state.activeModalId = 'taskModal';
now += 10 * 60_000;
interval(); visibility();
assert.equal(scrolls, 1, 'open popover blocks periodic and visibility scrolls');
assert.equal(updates, 3, 'time indicators keep updating');
state.activeModalId = null;
now += 2 * 60_000 - 1;
interval(); visibility();
assert.equal(scrolls, 1, 'closing starts a full two-minute pause');
now++;
interval();
assert.equal(scrolls, 2, 'periodic scrolling resumes after two minutes');
state.activeModalId = 'taskModal';
state.activeModalId = null;
now += 60_000;
state.activeModalId = 'taskModal';
state.activeModalId = 'daySummaryModal';
now += 60_000;
visibility();
assert.equal(scrolls, 2, 'reopening resets the cooldown on the next close');
now += 60_000;
visibility();
assert.equal(scrolls, 3, 'visibility scrolling also resumes after cooldown');
state.activeModalId = 'taskModal';
state.activeModalId = null;
now += 2 * 60_000;
interval();
assert.equal(scrolls, 4, 'the cooldown can expire before the regular five-minute interval');
now += 60_000;
interval();
assert.equal(scrolls, 4, 'subsequent scrolling follows the regular interval');
cleanups.forEach((cleanup) => cleanup());
assert.equal(interval, undefined);
assert.equal(visibility, undefined);
console.log('Calendar auto-scroll checks passed.');
