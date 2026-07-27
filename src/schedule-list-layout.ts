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

export const LIST_OPERATOR_ORIGIN_PX = 248;
export const LIST_OPERATOR_FRAME_SIZE_PX = 88;
export const LIST_FUNCTIONAL_GROUP_GAP_PX = 12;
export const LIST_MEETING_COLUMN_INSET_PX =
  LIST_OPERATOR_FRAME_SIZE_PX + LIST_FUNCTIONAL_GROUP_GAP_PX / 2;

const LIST_OPERATOR_COLUMN_GAP = "clamp(0.75rem, 1.25vw, 1.25rem)";
const LIST_FUNCTIONAL_GRID_CLASS = "xl:grid-cols-3";
const LIST_MEETING_ROOM_SPAN_CLASS = "xl:col-span-2";
const LIST_FUNCTIONAL_OPERATOR_PLACEMENT_CLASS =
  "xl:absolute xl:inset-y-0";

export function isListFunctionalFacilityRoom(group: RoomGroup): boolean {
  return LIST_FUNCTIONAL_FACILITY_GROUPS.has(group);
}

export function listRoomUsesAlignedOperatorOrigin(group: RoomGroup): boolean {
  return LIST_ALIGNED_OPERATOR_ORIGIN_GROUPS.has(group);
}

export function listRoomHeightClass(group: RoomGroup): string {
  if (group === "manufacture") return "h-[160px]";
  if (isListFunctionalFacilityRoom(group)) return "h-[128px]";
  return "h-[144px]";
}

export function listRoomTitleSizeClass(group: RoomGroup): string {
  return group === "processing"
    ? "text-[24px] max-sm:text-[16px]"
    : "text-[18px] max-sm:text-[16px]";
}

export function listFunctionalOperatorPosition(
  group: RoomGroup,
): { columnGap: string; left: string } | undefined {
  if (!isListFunctionalFacilityRoom(group)) return undefined;

  return {
    columnGap: LIST_OPERATOR_COLUMN_GAP,
    left: group === "meeting"
      ? `max(0px, min(${LIST_OPERATOR_ORIGIN_PX}px, calc(50cqw - ${LIST_MEETING_COLUMN_INSET_PX}px)))`
      : `max(0px, min(${LIST_OPERATOR_ORIGIN_PX}px, calc(100cqw - ${LIST_OPERATOR_FRAME_SIZE_PX}px)))`,
  };
}

export function listFunctionalOperatorPlacementClass(
  group: RoomGroup,
): string | undefined {
  return isListFunctionalFacilityRoom(group)
    ? LIST_FUNCTIONAL_OPERATOR_PLACEMENT_CLASS
    : undefined;
}

export function listFunctionalFacilityGridClass(): string {
  return LIST_FUNCTIONAL_GRID_CLASS;
}

export function listMeetingRoomSpanClass(
  group: RoomGroup,
): string | undefined {
  return group === "meeting" ? LIST_MEETING_ROOM_SPAN_CLASS : undefined;
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
