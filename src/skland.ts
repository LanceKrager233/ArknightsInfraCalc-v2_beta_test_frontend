import { md5 } from "js-md5";

import { OperBoxEntry } from "./types";

const SKLAND_ORIGIN = "https://zonai.skland.com";
const BINDING_PATH = "/api/v1/game/player/binding";
const CULTIVATION_PATH = "/api/v1/game/cultivate/player";

type SklandCredentials = {
  cred: string;
  token: string;
};

type SklandBinding = {
  uid: string;
  nickName?: string;
  isOfficial?: boolean;
};

type SklandCharacter = {
  id: string;
  level?: number;
  evolvePhase?: number;
  potentialRank?: number;
};

type SklandResponse<T> = {
  code: number;
  message?: string;
  data?: T;
};

let deviceId: string | null = null;

function byteArrayToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createDeviceId(): string {
  if (!deviceId) {
    deviceId =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID().toUpperCase()
        : `INFRA-CALC-${Date.now()}-${Math.random().toString(16).slice(2)}`.toUpperCase();
  }
  return deviceId;
}

async function createHeaders(path: string, credentials: SklandCredentials): Promise<HeadersInit> {
  const timestamp = `${Math.floor(Date.now() / 1000)}`;
  const platform = "3";
  const dId = createDeviceId();
  const vName = "1.0.0";
  const signPayload = `${path.replace(/\?/, "")}${timestamp}${JSON.stringify({
    platform,
    timestamp,
    dId,
    vName,
  })}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(credentials.token),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(signPayload));

  return {
    Cred: credentials.cred,
    Sign: md5(byteArrayToHex(digest)),
    dId,
    platform,
    timestamp,
    vName,
  };
}

async function fetchSkland<T>(path: string, credentials: SklandCredentials): Promise<T> {
  const response = await fetch(`${SKLAND_ORIGIN}${path}`, {
    headers: await createHeaders(path, credentials),
  });
  const body = (await response.json().catch(() => null)) as SklandResponse<T> | null;
  if (!response.ok || !body || body.code !== 0 || !body.data) {
    throw new Error(body?.message || `森空岛请求失败（HTTP ${response.status}）`);
  }
  return body.data;
}

export function parseSklandCredentials(value: string): SklandCredentials {
  const normalized = value.trim().replace(/^['"]|['"]$/g, "").replace(/\s+/g, "");
  const comma = normalized.indexOf(",");
  const cred = comma >= 0 ? normalized.slice(0, comma) : "";
  const token = comma >= 0 ? normalized.slice(comma + 1) : "";
  if (cred.length < 16 || token.length < 16) {
    throw new Error("凭据格式不正确，请粘贴“cred,token”完整内容。");
  }
  return { cred, token };
}

function selectBinding(data: { list?: Array<{ appCode?: string; defaultUid?: string; bindingList?: SklandBinding[] }> }): SklandBinding {
  const app = data.list?.find((entry) => entry.appCode === "arknights");
  const bindings = app?.bindingList ?? [];
  const selected =
    bindings.find((binding) => binding.uid === app?.defaultUid) ??
    bindings.find((binding) => binding.isOfficial) ??
    bindings[0];
  if (!selected?.uid) throw new Error("森空岛账号没有绑定明日方舟角色。");
  return selected;
}

function numberOr(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? Number(value) : fallback;
}

export async function importSklandCultivation(
  rawCredentials: string,
  catalog: OperBoxEntry[]
): Promise<{ operbox: OperBoxEntry[]; nickname: string; ownedCount: number }> {
  const credentials = parseSklandCredentials(rawCredentials);
  const bindingData = await fetchSkland<{
    list?: Array<{ appCode?: string; defaultUid?: string; bindingList?: SklandBinding[] }>;
  }>(BINDING_PATH, credentials);
  const binding = selectBinding(bindingData);
  const path = `${CULTIVATION_PATH}?uid=${encodeURIComponent(binding.uid)}`;
  const cultivation = await fetchSkland<{ characters?: SklandCharacter[] }>(path, credentials);
  const characters = cultivation.characters ?? [];
  if (characters.length === 0) throw new Error("森空岛没有返回干员练度数据。");

  const owned = new Map(characters.map((character) => [character.id, character]));
  const operbox = catalog.map((entry) => {
    const character = owned.get(entry.id);
    return character
      ? {
          ...entry,
          own: true,
          elite: numberOr(character.evolvePhase, 0),
          level: numberOr(character.level, 1),
          potential: numberOr(character.potentialRank, 0) + 1,
        }
      : { ...entry, own: false, elite: 0, level: 0, potential: 1 };
  });

  return {
    operbox,
    nickname: binding.nickName || binding.uid,
    ownedCount: characters.length,
  };
}
