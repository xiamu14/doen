const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const { outputText } = ts.transpileModule(fs.readFileSync("src/components/Dialog/task-modal.tsx", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
});

async function check(action, duration, fails = false) {
  let now = 0, cursor = 0, writes = 0, requests = 0, closedAt;
  const slots = [], effects = [], timers = new Map();
  const task = { id: "task", title: "Video Studio", content: "Description", start: "2026-11-04T08:00:00", duration: 60, status: "idle", projectId: null };
  const result = { exports: {} };
  const delayed = (callback, delay) => {
    const id = {};
    timers.set(id, { at: now + delay, callback });
    return id;
  };
  const request = () => {
    requests++;
    return new Promise((resolve, reject) => delayed(() => fails ? reject(new Error("Save failed")) : resolve(task), duration));
  };
  vm.runInNewContext(outputText, {
    exports: result.exports,
    Error,
    Date: class extends Date { static now() { return now; } },
    setTimeout: delayed,
    clearTimeout: (id) => timers.delete(id),
    require(name) {
      if (name === "react") return {
        useRef(value) { const index = cursor++; return slots[index] ??= { current: value }; },
        useState(value) {
          const index = cursor++;
          if (!(index in slots)) slots[index] = value;
          return [slots[index], (next) => {
            if (!Object.is(slots[index], next)) { writes++; slots[index] = next; }
          }];
        },
        useEffect: (fn) => effects.push(fn), useLayoutEffect() {},
      };
      if (name === "valtio") return { useSnapshot: () => ({ activeModalId: "taskModal", extraData: { task } }) };
      if (name === "@tanstack/react-query") return {
        useQuery: () => ({ data: { data: { project: [] } } }), useQueryClient: () => ({ setQueryData() {} }),
      };
      if (name === "@/client/api/task") return { updateTask: request, deleteTask: request };
      if (name === "./utils") return { DialogUtils: { hide: () => { closedAt = now; } } };
      if (name === "@/lib/task-tags") return { TASK_TAGS: [{}], normalizeTaskTagId: () => "easy|pressing" };
      if (name === "@/components/task/calendar-time") return { FIRST_HOUR: 6, LAST_HOUR: 24, SLOT_MINUTES: 15 };
      if (name === "@/lib/task-schedule-config") return { MIN_TASK_DURATION: 15, MAX_TASK_DURATION: 480 };
      if (name.startsWith("@/") || name.startsWith("./")) return {};
      return require(name);
    },
  });
  const render = () => { cursor = 0; return result.exports.default(); };
  function find(node, predicate) {
    if (!node || typeof node !== "object") return;
    if (predicate(node)) return node;
    for (const child of [node.props?.children].flat(Infinity)) {
      const match = find(child, predicate);
      if (match) return match;
    }
  }
  const settle = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
  async function advance(target) {
    while (true) {
      const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > target) break;
      now = next[1].at;
      timers.delete(next[0]);
      next[1].callback();
      await settle();
    }
    now = target;
    await settle();
  }
  render(); effects[0]();
  const tree = render();
  const submit = action === "Delete"
    ? () => find(tree, (node) => node.type === "button" && node.props.children === "Delete").props.onClick()
    : () => find(tree, (node) => node.type === "form").props.onSubmit({ preventDefault() {} });
  writes = 0;
  const pending = submit();
  await submit();
  assert.equal(requests, 1, "duplicate clicks must be blocked before Saving appears");
  assert.equal(writes, 0, "starting a request must not update parent state");
  await advance(499);
  if (duration < 500) {
    await pending;
    assert.equal(closedAt, fails ? undefined : duration);
    assert.equal(writes, fails ? 1 : 0, "fast requests never toggle Saving");
  } else {
    assert.equal(writes, 0);
    await advance(500);
    assert.equal(writes, 1, "show Saving after 500ms");
    await advance(Math.max(1000, duration) - 1);
    assert.equal(closedAt, undefined);
    assert.equal(writes, 1, "retain Saving for at least 500ms");
    await advance(Math.max(1000, duration));
    await pending;
    assert.equal(closedAt, fails ? undefined : Math.max(1000, duration));
    assert.equal(writes, fails ? 3 : 1, "success keeps Saving stable through the exit animation; failure restores controls and shows the error");
  }
  if (fails) assert.ok(find(render(), (node) => node.props?.role === "alert" && node.props.children === "Save failed"));
}
(async () => {
  for (const action of ["Delete", "Apply"]) {
    for (const duration of [100, 600, 1500]) {
      await check(action, duration);
      await check(action, duration, true);
    }
  }
  console.log("Task modal saving checks passed.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
