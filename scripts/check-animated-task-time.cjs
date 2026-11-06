const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
let effects = [], animations = [], values = [], reduced = false;
const react = {
  createRef: () => ({ current: null }), useMemo: (create) => create(),
  memo: (component) => component, forwardRef: (component) => component,
  useRef: (current) => ({ current }), useEffect: (effect) => effects.push(effect),
  useImperativeHandle: (ref, create) => { ref.current = create(); },
};
const motion = {
  motion: { span: 'motion.span' }, useReducedMotion: () => reduced,
  useMotionValue: (initial) => { const value = { value: initial, get() { return this.value; }, set(next) { this.value = next; } }; values.push(value); return value; },
  useTransform: (value, transform) => ({ get: () => transform(value.get()) }),
  animate: (value, target) => { const animation = { value, target, stopped: false, stop() { this.stopped = true; } }; animations.push(animation); return animation; },
};
const compiled = ts.transpileModule(fs.readFileSync('src/components/task/animated-task-time.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
const result = { exports: {} };
vm.runInNewContext(compiled, { exports: result.exports, require(name) {
  if (name === 'react') return react;
  if (name === 'motion/react') return motion;
  return require(name);
} });
const ref = { current: null };
const tree = result.exports.AnimatedTaskTime({ start: '2026-11-06T09:45:00', duration: 60 }, ref);
for (const endpoint of tree.props.children[1].props.children) {
  for (const slot of endpoint.props.children[1]) {
    const digit = slot.props.children[1];
    const handle = { current: null };
    digit.type(digit.props, handle);
    digit.props.ref.current = handle.current;
  }
}
effects.forEach((effect) => effect());
assert.equal(animations.length, 0, 'initial mount does not animate');
ref.current.update('2026-11-06T10:00:00', 60);
assert.equal(animations.length, 8, 'only changed digits and the newly visible hour width animate');
assert.ok(animations.filter((a) => a.value !== values[1]).every((a) => a.target >= a.value.get()), 'later time rolls upward, including 9 to 0');
const count = animations.length;
ref.current.update('2026-11-06T10:00:00', 60);
assert.equal(animations.length, count, 'save echo does not restart animation');
// Interrupt the minute tens midway through its upward roll.
values[4].set(17.5);
ref.current.update('2026-11-06T09:30:00', 60);
assert.equal(values[4].get(), 17.5, 'interruption preserves fractional position');
assert.ok(animations.at(-1).target <= animations.at(-1).value.get(), 'earlier time rolls downward');
assert.ok(animations.some((a) => a.stopped), 'superseded animation stops');
reduced = true;
// Mount a digit with reduced motion enabled.
const digitElement = tree.props.children[1].props.children[0].props.children[1][0].props.children[1];
const digitRef = { current: null };
const digitTree = digitElement.type(digitElement.props, digitRef);
const blur = digitTree.props.children[1].props.style;
assert.equal(blur.opacity.get(), 0, 'stationary digits stay sharp');
values.at(-2).set(10.5);
assert.equal(blur.opacity.get(), 1, 'halfway rolling digits get the strongest edge blur');
values.at(-2).set(10.25);
assert.ok(blur.opacity.get() > 0 && blur.opacity.get() < 1, 'blur ramps progressively');
values.at(-2).set(11);
assert.equal(blur.opacity.get(), 0, 'blur clears when the digit settles');
assert.ok(blur.maskImage.includes('transparent 45%'), 'center remains sharp while edges blur');
const beforeReduced = animations.length;
digitRef.current.update(2, 1, false);
assert.equal(animations.length, beforeReduced, 'reduced motion sets values immediately');
assert.equal(values.at(-2).get(), 12);
assert.ok(!compiled.includes('useState'), 'animation updates never schedule React state renders');
console.log('Animated task time checks passed.');
