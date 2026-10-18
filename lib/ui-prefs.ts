const uiPrefix = "lifeos.ui.";

export function readUiString(key: string): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return window.localStorage.getItem(uiPrefix + key) ?? undefined;
}

export function writeUiString(key: string, value: string | null): void {
  if (typeof window === "undefined") {
    return;
  }
  if (value === null) {
    window.localStorage.removeItem(uiPrefix + key);
  } else {
    window.localStorage.setItem(uiPrefix + key, value);
  }
}

export function readUiJson<T>(
  key: string,
  validate: (value: unknown) => value is T,
): T | undefined {
  const raw = readUiString(key);
  if (raw === undefined) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return validate(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function writeUiJson(key: string, value: unknown): void {
  writeUiString(key, JSON.stringify(value));
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
