export const TASK_TAGS = [
  { name: "easy", color: "#69D571", backgroundColor: "#E7F7E9" },
  { name: "difficulty", color: "#D569B2", backgroundColor: "#F6E7F1" },
  { name: "pressing", color: "#697ED5", backgroundColor: "#E8EBF8" },
  { name: "later", color: "#D5C169", backgroundColor: "#F8F3E5" },
] as const;

export type TaskTagName = (typeof TASK_TAGS)[number]["name"];
