import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_LIST_COLLAPSED_GROUPS,
  buildListScheduleGroups,
  listRoomHeightClass,
  listRoomUsesAlignedOperatorOrigin,
  listRoomUsesPowerColumnAlignment,
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

test("anchors the meeting-room operators to the second power-station column", () => {
  assert.equal(listRoomUsesPowerColumnAlignment("meeting"), true);
  assert.equal(listRoomUsesPowerColumnAlignment("power"), false);
  assert.equal(listRoomUsesPowerColumnAlignment("manufacture"), false);
});
