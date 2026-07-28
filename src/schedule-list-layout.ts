import type { RoomGroup, RoomRow } from "./schedule";

export interface ListScheduleGroup {
  label: string;
  rows: RoomRow[];
}

const LIST_FUNCTIONAL_FACILITY_GROUPS = new Set<RoomGroup>([
  "hire",
  "power",
  "meeting",
  "processing",
]);

const LIST_ALIGNED_OPERATOR_ORIGIN_GROUPS = new Set<RoomGroup>([
  "control",
  "trading",
  "manufacture",
  "dormitory",
]);

const LIST_FUNCTIONAL_FACILITY_ORDER: Partial<Record<RoomGroup, number>> = {
  power: 0,
  meeting: 1,
  hire: 2,
  processing: 3,
};

export const LIST_OPERATOR_ORIGIN_PX = 248;
export const LIST_OPERATOR_FRAME_SIZE_PX = 88;
export const LIST_FUNCTIONAL_GROUP_GAP_PX = 12;
export const LIST_MEETING_COLUMN_INSET_PX =
  LIST_OPERATOR_FRAME_SIZE_PX + LIST_FUNCTIONAL_GROUP_GAP_PX / 2;

const LIST_OPERATOR_COLUMN_GAP = "clamp(0.75rem, 1.25vw, 1.25rem)";
const LIST_FUNCTIONAL_GRID_CLASS = "xl:grid-cols-12";
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

export function listRoomTitleSizeClass(): string {
  return "text-[18px] max-sm:text-[16px]";
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

export function listFunctionalRoomSpanClass(
  group: RoomGroup,
  powerCount: number,
): string | undefined {
  if (group === "power") {
    if (powerCount <= 1) return "xl:col-span-12";
    return powerCount === 2 ? "xl:col-span-6" : "xl:col-span-4";
  }
  if (group === "meeting") return "xl:col-span-6";
  if (group === "hire" || group === "processing") return "xl:col-span-3";
  return undefined;
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

  const functionalGroup = groups.find((group) => group.label === "功能设施");
  functionalGroup?.rows.sort(
    (left, right) =>
      (LIST_FUNCTIONAL_FACILITY_ORDER[left.group] ?? Number.MAX_SAFE_INTEGER)
      - (LIST_FUNCTIONAL_FACILITY_ORDER[right.group] ?? Number.MAX_SAFE_INTEGER),
  );

  return groups;
}
