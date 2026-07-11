type JsonRecord = Record<string, unknown>;
const object = (value: unknown): value is JsonRecord => Boolean(value) && typeof value === "object" && !Array.isArray(value);

export function parseTeamShiftV1(raw: string): unknown {
  const value = JSON.parse(raw) as unknown;
  if (!object(value) || value.schema_version !== 1 || value.kind !== "arknights_infra_team_shift") {
    throw new Error("不支持的 team shift JSON 版本");
  }
  if (!object(value.assignment) || !object(value.scores) || !Array.isArray(value.scores.room_lines)) {
    throw new Error("team shift JSON 缺少 assignment 或 scores.room_lines");
  }
  return value;
}
