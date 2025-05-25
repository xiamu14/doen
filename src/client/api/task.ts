export async function getList() {
  const response = await fetch("/api/list");
  const data = await response.json();
  return data;
}
