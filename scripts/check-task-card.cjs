const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

// Exercise the component's event handlers without a browser or database.
let effects;
let draggables;
let opened;
const column = { offsetLeft: 0, offsetWidth: 150, getBoundingClientRect: () => ({ left: 0, right: 150 }) };
const card = {
  offsetLeft: 11, offsetTop: 1, offsetWidth: 128, offsetHeight: 48,
  parentElement: { querySelectorAll: () => [column] },
  getBoundingClientRect: () => ({ top: 1, bottom: 49 }),
};
const animation = { registerPlugin() {}, killTweensOf() {}, set() {}, to() {} };
const { outputText } = ts.transpileModule(fs.readFileSync("src/components/task/task-calendar-card.tsx", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
});
const moduleResult = { exports: {} };
vm.runInNewContext(outputText, {
  exports: moduleResult.exports,
  document: { createElement: () => ({}) },
  window: { innerWidth: 1280 },
  require(name) {
    if (name === "react") return {
      useRef: (current) => ({ current: current === null ? card : current }),
      useEffect: (effect) => effects.push(effect),
    };
    if (name === "gsap") return animation;
    if (name === "gsap/Draggable") return { Draggable: { create: (_target, options) => {
      draggables.push(options);
      return [{ update() {}, disable() {}, enable() {}, kill() {} }];
    } } };
    if (name === "../Dialog") return { DialogUtils: { show: () => opened++ } };
    if (name === "./calendar-time") return {
      SLOT_MINUTES: 15, SLOT_HEIGHT: 25, SLOT_COUNT: 64,
      slotFromStart: () => 0, taskModalX: () => 0,
    };
    if (name === "@/lib/task-tags") return { TASK_TAGS: [{ name: "easy|pressing" }] };
    if (name === "@/lib/task-schedule-config") return { MIN_TASK_DURATION: 15, MAX_TASK_DURATION: 480 };
    return require(name);
  },
});

function mount(status = "idle") {
  effects = []; draggables = []; opened = 0;
  const element = moduleResult.exports.default({
    task: { id: "test", title: "Task", start: "2026-10-20T08:00:00Z", duration: 30, status },
    dates: ["2026-10-20"], dayIndex: 0, onChange() {},
  });
  effects.forEach((effect) => effect());
  const pointer = (x = 0, y = 0, buttons = 1) => ({ clientX: x, clientY: y, buttons });
  return {
    down: () => element.props.onPointerDownCapture(pointer()),
    move: (x, y, buttons) => element.props.onPointerMoveCapture(pointer(x, y, buttons)),
    click: () => element.props.onClick({ stopPropagation() {}, currentTarget: card, clientY: 0 }),
  };
}

const gesture = mount();
gesture.down(); gesture.move(1, 1); gesture.click();
assert.equal(opened, 1, "normal clicks tolerate small pointer jitter");
gesture.down(); gesture.move(0, 8); gesture.move(0, 0); gesture.click(); gesture.click();
assert.equal(opened, 1, "snapped movement and repeated trailing clicks must not open the modal");
gesture.down(); gesture.click();
assert.equal(opened, 2, "the next deliberate click still opens the modal");
for (const draggable of draggables) {
  gesture.down(); draggable.onDragStart(); gesture.click();
  assert.equal(opened, 2, "both card dragging and resizing suppress clicks");
}
gesture.down(); gesture.move(20, 20, 0); gesture.click();
assert.equal(opened, 3, "hover movement does not suppress clicks");
const done = mount("done");
done.down(); done.click();
assert.equal(opened, 1, "completed tasks can still be opened");
console.log("Task card gesture checks passed.");
