import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_LIST_COLLAPSED_GROUPS,
  LIST_FUNCTIONAL_GROUP_GAP_PX,
  LIST_MEETING_COLUMN_INSET_PX,
  LIST_OPERATOR_FRAME_SIZE_PX,
  LIST_OPERATOR_ORIGIN_PX,
  buildListScheduleGroups,
  listFunctionalFacilityGridClass,
  listFunctionalOperatorPosition,
  listFunctionalOperatorPlacementClass,
  listMeetingRoomSpanClass,
  listRoomHeightClass,
  listRoomTitleSizeClass,
  listRoomUsesAlignedOperatorOrigin,
} from "./schedule-list-layout.ts";
import type { RoomGroup, RoomRow } from "./schedule.ts";

function roomRow(group: RoomGroup, groupLabel: string, index = 0): RoomRow {
  return {
    key: `${group}-${index}`,
    group,
    groupLabel,
    index,
    roomId: `${group}-${index}`,
    title: groupLabel,
    operators: [],
    operatorSlots: [],
    rule: "",
    suspicious: false,
  };
}

test("keeps processing outside functional facilities and places it last", () => {
  const groups = buildListScheduleGroups([
    roomRow("control", "控制中枢"),
    roomRow("power", "发电站"),
    roomRow("hire", "办公室"),
    roomRow("processing", "加工站"),
    roomRow("meeting", "会客室"),
    roomRow("dormitory", "宿舍"),
  ]);

  assert.deepEqual(groups.map((group) => group.label), [
    "控制中枢",
    "功能设施",
    "宿舍",
    "加工站",
  ]);
  assert.deepEqual(
    groups.find((group) => group.label === "功能设施")?.rows.map((row) => row.group),
    ["power", "hire", "meeting"],
  );
});

test("collapses processing by default in list view", () => {
  assert.equal(DEFAULT_LIST_COLLAPSED_GROUPS["加工站"], true);
});

test("aligns production operator origins with the control center", () => {
  assert.equal(listRoomUsesAlignedOperatorOrigin("control"), true);
  assert.equal(listRoomUsesAlignedOperatorOrigin("trading"), true);
  assert.equal(listRoomUsesAlignedOperatorOrigin("manufacture"), true);
  assert.equal(listRoomUsesAlignedOperatorOrigin("processing"), true);
  assert.equal(listRoomUsesAlignedOperatorOrigin("power"), false);
});

test("adds breathing room only to manufacturing and functional facility cards", () => {
  assert.equal(listRoomHeightClass("manufacture"), "h-[160px]");
  assert.equal(listRoomHeightClass("power"), "h-[128px]");
  assert.equal(listRoomHeightClass("meeting"), "h-[128px]");
  assert.equal(listRoomHeightClass("trading"), "h-[144px]");
});

test("uses 18px list room titles except for processing", () => {
  for (const group of [
    "control",
    "trading",
    "manufacture",
    "dormitory",
    "power",
    "hire",
    "meeting",
  ] satisfies RoomGroup[]) {
    assert.equal(
      listRoomTitleSizeClass(group),
      "text-[18px] max-sm:text-[16px]",
    );
  }

  assert.equal(
    listRoomTitleSizeClass("processing"),
    "text-[24px] max-sm:text-[16px]",
  );
});

test("positions functional operators at 248px and clamps before a frame clips", () => {
  const singleSlotPosition = {
    columnGap: "clamp(0.75rem, 1.25vw, 1.25rem)",
    left: `max(0px, min(${LIST_OPERATOR_ORIGIN_PX}px, calc(100cqw - ${LIST_OPERATOR_FRAME_SIZE_PX}px)))`,
  };

  assert.deepEqual(listFunctionalOperatorPosition("power"), singleSlotPosition);
  assert.deepEqual(listFunctionalOperatorPosition("hire"), singleSlotPosition);
  assert.equal(listFunctionalOperatorPosition("manufacture"), undefined);
});

test("keeps meeting operators on the same origin and existing gap", () => {
  assert.deepEqual(listFunctionalOperatorPosition("meeting"), {
    columnGap: "clamp(0.75rem, 1.25vw, 1.25rem)",
    left: `max(0px, min(${LIST_OPERATOR_ORIGIN_PX}px, calc(50cqw - ${LIST_MEETING_COLUMN_INSET_PX}px)))`,
  });
});

test("restores the functional facility three-column layout at the desktop breakpoint", () => {
  assert.equal(LIST_OPERATOR_ORIGIN_PX, 248);
  assert.equal(LIST_OPERATOR_FRAME_SIZE_PX, 88);
  assert.equal(LIST_FUNCTIONAL_GROUP_GAP_PX, 12);
  assert.equal(
    LIST_MEETING_COLUMN_INSET_PX,
    LIST_OPERATOR_FRAME_SIZE_PX + LIST_FUNCTIONAL_GROUP_GAP_PX / 2,
  );
  assert.equal(
    listFunctionalOperatorPlacementClass("power"),
    "xl:absolute xl:inset-y-0",
  );
  assert.equal(listFunctionalOperatorPlacementClass("manufacture"), undefined);
  assert.equal(
    listFunctionalFacilityGridClass(),
    "xl:grid-cols-3",
  );
  assert.equal(
    listMeetingRoomSpanClass("meeting"),
    "xl:col-span-2",
  );
  assert.equal(listMeetingRoomSpanClass("power"), undefined);
});
