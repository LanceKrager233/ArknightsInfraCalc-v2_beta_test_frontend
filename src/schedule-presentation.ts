import { operatorPresentationFor } from "./operatorPortraits";
import type { RoomRow } from "./schedule";

export function addOperatorPresentations(rows: RoomRow[]): RoomRow[] {
  return rows.map((row) => ({
    ...row,
    operatorSlots: row.operatorSlots.map((slot) => {
      const presentation = operatorPresentationFor({ name: slot.name, skill: slot.skill });
      return {
        ...slot,
        profession: presentation.operator?.profession,
        portrait: presentation.portrait,
        buildingSkill: presentation.buildingSkill,
      };
    }),
  }));
}
