const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

let active = { index: null, x: 0, y: 0 };
const result = { exports: {} };
const { outputText } = ts.transpileModule(fs.readFileSync("src/components/Dialog/summary-rings.tsx", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
});
vm.runInNewContext(outputText, {
  exports: result.exports,
  window: { innerWidth: 1280, innerHeight: 800 },
  require: (name) => name === "react"
    ? { useRef: () => ({ current: Array.from({ length: 3 }, () => ({ getBoundingClientRect: () => ({ width: 120 }) })) }), useState: () => [active, (value) => { active = typeof value === "function" ? value(active) : value; }] }
    : require(name),
});

function nodes(element) {
  if (!element || typeof element !== "object") return [];
  return [element, ...[element.props.children].flat(Infinity).flatMap(nodes)];
}
const render = (props) => nodes(result.exports.default(props));
const input = { planned: 450, completed: 150, total: 960 };
const chart = render(input);
const arcs = chart.filter((node) => node.type === "circle" && node.props.pathLength);
const expected = [46.875, 15.625, 100 / 3];
arcs.forEach((node, index) => {
  assert.ok(Math.abs(parseFloat(node.props.strokeDasharray) - expected[index]) < 1e-10);
});
const rings = chart.filter((node) => node.type === "g");
assert.equal(rings.length, 3);
for (const ring of rings) {
  assert.equal(ring.props.tabIndex, 0);
  ring.props.onPointerEnter({ clientX: 100, clientY: 200 });
  let tooltip = render(input).find((node) => node.props.role === "tooltip" && !node.props["aria-hidden"]);
  assert.ok(tooltip);
  assert.equal(tooltip.props.style.left, 112);
  assert.equal(tooltip.props.style.top, 212);
  ring.props.onPointerMove({ clientX: 1250, clientY: 780 });
  const moved = render(input).find((node) => node.props.role === "tooltip" && !node.props["aria-hidden"]);
  assert.equal(moved.props.style.left, 1152);
  assert.equal(moved.props.style.top, 736);
  const legend = render(input).find((node) => node.props.className === "flex flex-wrap justify-center gap-x-3 gap-y-1");
  assert.equal(legend.props["aria-hidden"], undefined);
  assert.ok(!legend.props.className.includes("opacity-0"));
  assert.equal(tooltip.props.children[0].props.children, ring.props["aria-label"].split(":")[0]);
  ring.props.onPointerLeave();
  assert.ok(!render(input).some((node) => node.props.role === "tooltip" && !node.props["aria-hidden"]));
  ring.props.onFocus({ currentTarget: { getBoundingClientRect: () => ({ right: 200, top: 100 }) } });
  assert.ok(render(input).some((node) => node.props.role === "tooltip" && !node.props["aria-hidden"]));
  ring.props.onBlur();
}
assert.equal(rings[0].props["aria-label"], "Planned: 7h30m / 16h");
assert.equal(rings[2].props["aria-label"], "Focus: 2h30m / 7h30m");
assert.equal(arcs[2].props.stroke, "#a4de6c");
assert.deepEqual(chart.filter((node) => node.type === "span").map((node) => node.props.children[1]), ["Focus", "Done", "Planned"]);
const short = render({ planned: 60, completed: 15, total: 960 }).filter((node) => node.type === "g");
assert.equal(short[0].props["aria-label"], "Planned: 1h / 16h");
assert.equal(short[2].props["aria-label"], "Focus: 15m / 1h");
const empty = render({ planned: 0, completed: 0, total: 960 }).find((node) => node.type === "g");
assert.equal(empty.props["aria-label"], "Planned: 0 / 16h");
assert.equal(render({ planned: 0, completed: 0, total: 960 }).filter((node) => node.props.pathLength).length, 0);
assert.ok(render({ planned: 1200, completed: 1200, total: 960 })
  .filter((node) => node.props.pathLength).every((node) => node.props.strokeDasharray === "100 100"));
console.log("Summary ring ratios, empty/overflow values, hover and keyboard checks passed.");

// Planned and Focus both include expired unfinished tasks.
const expired = render({ planned: 465, completed: 405, total: 960 });
assert.equal(expired.filter((node) => node.type === "g")[0].props["aria-label"], "Planned: 7h45m / 16h");
const focus = expired.filter((node) => node.type === "g")[2];
assert.equal(focus.props["aria-label"], "Focus: 6h45m / 7h45m");
const expiredArcs = expired.filter((node) => node.props.pathLength);
assert.equal(parseFloat(expiredArcs[0].props.strokeDasharray), 465 / 960 * 100);
assert.ok(Math.abs(parseFloat(expiredArcs[2].props.strokeDasharray) - 405 / 465 * 100) < 1e-10);
assert.ok(expired.find((node) => node.props.role === "tooltip").props.className.includes("w-max"));
