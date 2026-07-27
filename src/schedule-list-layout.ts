import type { RoomGroup, RoomRow } from "./schedule";

export interface ListScheduleGroup {
  label: string;
  rows: RoomRow[];
}

export const DEFAULT_LIST_COLLAPSED_GROUPS: Readonly<Record<string, boolean>> = {
  加工站: true,
};

const LIST_FUNCTIONAL_FACILITY_GROUPS = new Set<RoomGroup>([
  "hire",
  "power",
  "meeting",
]);

const LIST_ALIGNED_OPERATOR_ORIGIN_GROUPS = new Set<RoomGroup>([
  "control",
  "trading",
  "manufacture",
  "dormitory",
  "processing",
]);

export function isListFunctionalFacilityRoom(group: RoomGroup): boolean {
  return LIST_FUNCTIONAL_FACILITY_GROUPS.has(group);
}

export function listRoomUsesAlignedOperatorOrigin(group: RoomGroup): boolean {
  return LIST_ALIGNED_OPERATOR_ORIGIN_GROUPS.has(group);
}

export function buildListScheduleGroups(rows: RoomRow[]): ListScheduleGroup[] {
  const groups = rows.reduce<ListScheduleGroup[]>((currentGroups, row) => {
    const groupLabel = isListFunctionalFacilityRoom(row.group)
      ? "功能设施"
      : row.groupLabel;
    const group = currentGroups.find((item) => item.label === groupLabel);

    if (group) {
      group.rows.push(row);
    } else {
      currentGroups.push({ label: groupLabel, rows: [row] });
    }

    return currentGroups;
  }, []);

  return [
    ...groups.filter((group) => group.rows[0]?.group !== "processing"),
    ...groups.filter((group) => group.rows[0]?.group === "processing"),
  ];
}
