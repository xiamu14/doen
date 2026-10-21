const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToString } = require("react-dom/server");

const { outputText } = ts.transpileModule(fs.readFileSync("src/components/task/task-calendar-row.tsx", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
});
let now = new Date(2026, 9, 22, 23, 59);
let listener;
const updates = { subscribe(update) { listener = update; return () => { listener = undefined; }; } };
function load(react = React) {
  const result = { exports: {} };
  vm.runInNewContext(outputText, {
    exports: result.exports,
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : [now.getTime()])); } },
    require(name) {
      if (name === "react") return react;
      if (name === "@/components/ui/utils") return { cn: (...classes) => classes.join(" ") };
      if (name === "./calendar-time-updates") return { calendarTimeUpdates: updates };
      if (name === "./calendar-time") return {
        SLOT_HEIGHT: 25,
        slotFromStart: (time) => {
          const date = new Date(time);
          return ((date.getHours() - 7) * 60 + date.getMinutes()) / 15;
        },
      };
      return require(name);
    },
  });
  return result.exports.default;
}
const props = { date: "2026-10-22", tasks: [], onCreateTask() {} };
const Row = load();
const server = renderToString(React.createElement(Row, props));
now = new Date(2026, 9, 23, 0, 0);
assert.equal(renderToString(React.createElement(Row, props)), server, "initial markup stays identical across midnight");
assert.match(server, /hidden=""/, "time line starts hidden until effects run");

const line = { hidden: true, style: {} };
let effect;
const TestRow = load({ useRef: () => ({ current: line }), useEffect: (callback) => { effect = callback; } });
const element = TestRow(props).props.children;
element.type(element.props);
now = new Date(2026, 9, 22, 8, 0);
const cleanup = effect();
assert.equal(line.hidden, false, "mount immediately shows today's time line");
assert.equal(line.style.top, "100px");
listener(new Date(2026, 9, 22, 8, 15));
assert.equal(line.style.top, "125px", "published time moves the line");
listener(new Date(2026, 9, 23, 0, 0));
assert.equal(line.hidden, true, "yesterday's line hides at midnight");
cleanup();
assert.equal(listener, undefined, "unmount removes the subscription");

const next = TestRow({ ...props, date: "2026-10-23" }).props.children;
next.type(next.props);
now = new Date(2026, 9, 22, 23, 59);
const cleanupNext = effect();
assert.equal(line.hidden, true);
listener(new Date(2026, 9, 23, 8, 0));
assert.equal(line.hidden, false, "the next day's line appears without a remount");
assert.equal(line.style.top, "100px");
cleanupNext();
console.log("Current time line checks passed.");
