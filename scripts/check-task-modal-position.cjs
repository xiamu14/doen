const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

// Exercise the modal's layout effect with the same deferred panel mount as Dialog.
let layoutEffect;
let frame;
let resize;
let panel = null;
const positions = [];
const data = { x: 100, y: 700, top: 650, bottom: 700 };
const viewport = { innerHeight: 800, addEventListener: (_name, fn) => { resize = fn; }, removeEventListener() {} };
const { outputText } = ts.transpileModule(fs.readFileSync("src/components/Dialog/task-modal.tsx", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
});
const result = { exports: {} };
vm.runInNewContext(outputText, {
  exports: result.exports,
  window: viewport,
  requestAnimationFrame: (fn) => { frame = fn; return 1; },
  cancelAnimationFrame: () => { frame = undefined; },
  require(name) {
    if (name === "react") return {
      useEffect() {},
      useLayoutEffect: (fn) => { layoutEffect = fn; },
      useRef: () => ({ get current() { return panel; } }),
      useState: (value) => [value, (next) => { if (next?.placement) positions.push(next); }],
    };
    if (name === "valtio") return { useSnapshot: () => ({ activeModalId: "taskModal", extraData: data }) };
    if (name === "@tanstack/react-query") return { useQuery: () => ({}), useQueryClient: () => ({}) };
    if (name === "@/lib/task-tags") return { TASK_TAGS: [{}] };
    if (name.startsWith("@/") || name.startsWith("./") || name === "@headlessui/react") return {};
    return require(name);
  },
});
result.exports.default();

function flushFrame() {
  const callback = frame;
  frame = undefined;
  callback?.();
}
let cleanup = layoutEffect();
panel = { offsetHeight: 300 };
flushFrame();
assert.equal(positions.at(-1).placement, "bottom", "a low card opens upward");
cleanup();

for (const action of ["Delete", "Apply", "save failure"]) {
  positions.length = 0;
  cleanup = layoutEffect();
  assert.ok(positions.length > 0, `${action}: measure the mounted panel synchronously`);
  assert.ok(positions.every((position) => position.placement === "bottom" && position.offset === 100),
    `${action}: never reset an upward panel to the card's top while saving`);
  assert.equal(frame, undefined, `${action}: do not defer a mounted panel's position to the next paint`);
  cleanup();
}

positions.length = 0;
cleanup = layoutEffect();
viewport.innerHeight = 1000;
resize();
assert.equal(positions.at(-1).placement, "top", "resize recomputes the fitting placement immediately");
panel.offsetHeight = 900;
resize();
assert.equal(positions.at(-1).placement, "middle", "oversized panels retain the viewport fallback");
cleanup();
console.log("Task modal position checks passed.");
