const INTERNAL_FIELD_NAMES = new Set([
  "candidates",
  "clipath",
  "command",
  "coreroot",
  "datadir",
  "debug",
  "debugbundle",
  "feedbackroot",
  "fixturepath",
  "pid",
  "reporoot",
  "resultpath",
  "runpath",
  "serverequest",
  "serveresponse",
  "stderr",
  "stdout",
  "storageroot",
]);

export function stripInternalFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripInternalFields(item)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !INTERNAL_FIELD_NAMES.has(key.toLowerCase()))
        .map(([key, child]) => [key, stripInternalFields(child)])
    ) as T;
  }
  return value;
}
