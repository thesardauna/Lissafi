const KEY = "lissafi_usage_v1";

export function bumpUsage(promptId) {
  try {
    const data = readUsage();
    data[promptId] = (data[promptId] ?? 0) + 1;
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function readUsage() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
