export type RoomVisual = {
  accent: string;
  level: string;
  background: string;
};

const ROOM_VISUALS: Record<string, RoomVisual> = {
  trading: {
    accent: "#22BBFF",
    level: "#22BBFF",
    background: "/images/building-room-emblems/emblem_trading.png",
  },
  manufacture: {
    accent: "#FFD800",
    level: "#FFD800",
    background: "/images/building-room-emblems/emblem_manufacture.png",
  },
  power: {
    accent: "#B8F03A",
    level: "#B8F03A",
    background: "/images/building-room-emblems/emblem_power.png",
  },
  control: {
    accent: "#FFFFFF",
    level: "#FFFFFF",
    background: "/images/building-room-emblems/emblem_control.png",
  },
  dormitory: {
    accent: "#016E65",
    level: "#FFFFFF",
    background: "/images/building-room-emblems/emblem_dormitory.png",
  },
  meeting: {
    accent: "#FFFFFF",
    level: "#FFFFFF",
    background: "/images/building-room-emblems/emblem_meeting.png",
  },
  processing: {
    accent: "#FFFFFF",
    level: "#FFFFFF",
    background: "/images/building-room-emblems/emblem_workshop.png",
  },
  hire: {
    accent: "#FFFFFF",
    level: "#FFFFFF",
    background: "/images/building-room-emblems/emblem_hire.png",
  },
  training: {
    accent: "#FFFFFF",
    level: "#FFFFFF",
    background: "/images/building-room-emblems/emblem_training.png",
  },
  default: {
    accent: "#FFFFFF",
    level: "#FFFFFF",
    background: "/images/building-room-emblems/emblem_none.png",
  },
};

export function roomVisualFor(group: string): RoomVisual {
  return ROOM_VISUALS[group] ?? ROOM_VISUALS.default;
}
