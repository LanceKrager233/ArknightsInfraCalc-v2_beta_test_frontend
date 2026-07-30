import { expect, test, type Page } from "@playwright/test";

const requestId = "11111111-1111-4111-8111-111111111111";
const diagnosticId = "22222222-2222-4222-8222-222222222222";
const now = Date.now();
const layout243 = {
  template: "243",
  drone_cap: 235,
  scenario: {},
  rooms: [{ id: "workshop", kind: "workshop", level: 3 }],
};

const profile = {
  schema_version: 4,
  layout_label: "243",
  operbox_label: "243 全精二示例",
  baseline_label: "产品推荐基准",
  summary: { owned: 1, tier_up_owned: 1, trade_pool_ready: 1, manufacture_pool_ready: 1 },
  domains: [],
  rotation: {},
  baseline_rotation: {},
  actions: [],
  flags: [],
  narration_hints: [],
};

function maaPlan(index: number) {
  return {
    name: `班次 ${index + 1}`,
    description: `固定测试班次 ${index + 1}`,
    rooms: {
      processing: [{ operators: ["阿米娅"] }],
    },
  };
}

const planData = {
  profile,
  maa: {
    title: "明日方舟基建排班助手 · 243",
    plans: [maaPlan(0), maaPlan(1), maaPlan(2)],
  },
  rotation: {
    shifts: [0, 1, 2].map((index) => ({
      index,
      duration_hours: index === 0 ? 12 : 6,
      active_teams: ["A"],
      resting_team: "B",
      scores: { trade_score: 0, manu_prod_sum: 0, power_charge_sum: 0, room_lines: [] },
      weighted_trade: 0,
      weighted_manu: 0,
      weighted_power: 0,
    })),
    daily: { trade: 0, manu: 0, power: 0 },
  },
  durationMs: 42,
  diagnosticId,
};

const sampleData = [{
  id: "char_002_amiya",
  name: "阿米娅",
  elite: 2,
  level: 80,
  own: true,
  potential: 6,
  rarity: 5,
}];

const authenticatedSklandSnapshot = {
  player: {
    uid: "123456789",
    nickname: "测试博士",
    level: 120,
    channelName: "官服",
    avatarUrl: null,
    registerTs: 1_600_000_000,
    mainStageProgress: "14-21",
    resume: "为了更好的明天。",
    subscriptionEnd: 1_800_000_000,
    storeTs: 1_700_000_090,
    lastOnlineTs: 1_700_000_080,
    sanity: { current: 120, max: 135, completeRecoveryTime: 1_700_010_000 },
    secretary: { id: "char_002_amiya", name: "阿米娅", skinName: "见习联结者" },
    counts: { operators: 2, furniture: 200, skins: 1 },
  },
  roles: [
    { uid: "123456789", nickname: "测试博士", channelName: "官服", isDefault: true },
    { uid: "987654321", nickname: "测试博士二号", channelName: "B服", isDefault: false },
  ],
  operbox: [
    { id: "char_002_amiya", name: "阿米娅", elite: 2, level: 80, own: true, potential: 6, rarity: 5 },
    { id: "char_003_kalts", name: "凯尔希", elite: 2, level: 90, own: true, potential: 1, rarity: 6 },
  ],
  infrastructure: {
    currentTs: 1_700_000_100,
    storeTs: 1_700_000_090,
    layoutLabel: "243",
    layoutSuggestion: layout243,
    layoutWarning: null,
    tiredOperators: ["阿米娅"],
    labor: { value: 235, maxValue: 235, remainSecs: 0, lastUpdateTime: 1_700_000_000 },
    furnitureTotal: 200,
    training: {
      trainee: "凯尔希",
      trainer: "阿米娅",
      remainSecs: 3_600,
      remainPoint: 100,
      speed: 1.2,
      completeWorkTime: 1_700_003_700,
    },
    rooms: [
      {
        key: "control",
        group: "control",
        index: 0,
        level: 5,
        operators: [{ id: "char_002_amiya", name: "阿米娅", morale: 18, workTime: 7_200, lastMoraleUpdateTs: 1_700_000_050 }],
      },
      {
        key: "trade-0",
        group: "trading",
        index: 0,
        level: 3,
        product: "gold",
        operators: [],
        production: { stock: 10, capacity: 10, completed: null, remaining: null, completeWorkTime: 1_700_001_200 },
        orders: [{ delivery: [{ type: "material", count: 3 }], reward: { type: "lmd", count: 1_500 } }],
        lastUpdateTime: 1_700_000_000,
      },
      {
        key: "factory-0",
        group: "manufacture",
        index: 0,
        level: 3,
        product: "battle_record",
        operators: [],
        production: { stock: 2, capacity: 10, completed: 2, remaining: 8, completeWorkTime: 1_700_001_000 },
        speed: 1.5,
        lastUpdateTime: 1_700_000_000,
      },
      {
        key: "dorm-0",
        group: "dormitory",
        index: 0,
        level: 5,
        operators: [],
        comfort: 5_000,
      },
      {
        key: "meeting",
        group: "meeting",
        index: 0,
        level: 3,
        operators: [],
        clue: {
          board: ["莱茵生命", "罗德岛"],
          own: 4,
          received: 1,
          dailyReward: true,
          needReceive: 2,
          sharing: true,
          shareCompleteTime: 1_700_005_000,
        },
        completeWorkTime: 1_700_003_000,
        lastUpdateTime: 1_700_000_000,
      },
      {
        key: "hire",
        group: "hire",
        index: 0,
        level: 3,
        operators: [],
        refreshCount: 2,
        completeWorkTime: 1_700_002_000,
      },
    ],
  },
  operators: [
    {
      id: "char_003_kalts",
      name: "凯尔希",
      rarity: 6,
      profession: "MEDIC",
      subProfessionName: "医师",
      elite: 2,
      level: 90,
      potential: 1,
      favorPercent: 200,
      mainSkillLevel: 7,
      skills: [{ index: 1, specializeLevel: 3 }, { index: 2, specializeLevel: 1 }],
      modules: [{ id: "uniequip_1", name: "医者意志", level: 3, locked: false, isDefault: true }],
      currentSkinName: "残余",
      acquiredAt: 1_650_000_000,
      isAssist: true,
    },
    {
      id: "char_002_amiya",
      name: "阿米娅",
      rarity: 5,
      profession: "CASTER",
      subProfessionName: "中坚术师",
      elite: 2,
      level: 80,
      potential: 6,
      favorPercent: 200,
      mainSkillLevel: 7,
      skills: [{ index: 1, specializeLevel: 3 }],
      modules: [],
      currentSkinName: "见习联结者",
      acquiredAt: 1_600_000_000,
      isAssist: false,
    },
  ],
  skins: [{
    id: "skin_amiya",
    name: "见习联结者",
    brandId: "EPOQUE",
    operatorId: "char_002_amiya",
    operatorName: "阿米娅",
    obtainedAt: 1_660_000_000,
    isCurrent: true,
  }],
  progress: {
    recruit: [{ index: 0, startTs: 1_699_990_000, finishTs: 1_700_000_050 }],
    routine: { daily: { current: 8, total: 10 }, weekly: { current: 80, total: 100 } },
    campaign: {
      records: [{ name: "切尔诺伯格", zoneName: "乌萨斯", maxKills: 400 }],
      reward: { current: 1_800, total: 1_800 },
    },
    tower: {
      records: [{ name: "钢铁萝卜矿场", subName: "测试周期", best: 8 }],
      reward: {
        higher: { current: 1, total: 2 },
        lower: { current: 3, total: 4 },
        termTs: 1_800_000_000,
      },
    },
    rogue: [{ name: "傀影与猩红孤钻", relicCount: 120, bankCurrent: 300, bankRecord: 500 }],
    activities: [{
      name: "测试活动",
      startTime: 1_700_000_000,
      endTime: 1_800_000_000,
      rewardEndTime: 1_800_100_000,
      isReplicate: false,
      clearedStages: 8,
      totalStages: 10,
    }],
    bossRush: [{ played: true, stageCode: "TN-1", stageName: "测试关卡", difficulty: "NORMAL" }],
  },
  sourceName: "森空岛同步",
  warnings: [],
};

const primarySklandAccount = {
  accountId: "account_primary",
  selectedUid: authenticatedSklandSnapshot.player.uid,
  roles: authenticatedSklandSnapshot.roles,
};

async function mockApis(
  page: Page,
  options: {
    debugTools?: boolean;
    sklandConfigured?: boolean;
    sklandSnapshot?: typeof authenticatedSklandSnapshot;
    sklandAccounts?: typeof primarySklandAccount[];
    activeAccountId?: string | null;
  } = {}
) {
  await page.route("**/api/health", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: { "X-Request-Id": requestId },
    body: JSON.stringify({
      success: true,
      data: {
        status: "ready",
        plannerReady: true,
        skland: {
          available: Boolean(options.sklandConfigured),
          message: options.sklandConfigured ? null : "当前未开放森空岛登录，可使用 MAA 导入。",
        },
        features: { debugTools: Boolean(options.debugTools), rateLimit: false },
      },
      requestId,
    }),
  }));
  await page.route("**/api/skland/session", (route) => {
    const isLogout = route.request().method() === "DELETE";
    const accounts = options.sklandAccounts
      ?? (options.sklandSnapshot ? [{
        ...primarySklandAccount,
        selectedUid: options.sklandSnapshot.player.uid,
        roles: options.sklandSnapshot.roles,
      }] : []);
    const activeAccountId = options.activeAccountId
      ?? (accounts.length ? accounts[0].accountId : null);
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "X-Request-Id": requestId },
      body: JSON.stringify({
        success: true,
        data: isLogout
          ? {
              authenticated: false,
              configured: Boolean(options.sklandConfigured),
              authMethods: { qr: true },
              accounts: [],
              activeAccountId: null,
            }
          : {
              authenticated: Boolean(options.sklandSnapshot),
              configured: Boolean(options.sklandConfigured),
              authMethods: { qr: true },
              accounts,
              activeAccountId,
              disabledReason: options.sklandConfigured
                ? null
                : "当前未开放森空岛登录，可使用 MAA 导入。",
              ...(options.sklandSnapshot ? { snapshot: options.sklandSnapshot } : {}),
            },
        requestId,
      }),
    });
  });
  await page.route("**/api/sample-operbox", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: { sourceName: "243 全精二示例", operbox: sampleData },
      requestId,
    }),
  }));
  await page.route("**/api/plan", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: options.debugTools
        ? {
            ...planData,
            debug: {
              command: "infra-cli serve",
              stdout: "test output",
              stderr: "",
              debugBundle: { version: "test" },
            },
          }
        : planData,
      requestId,
    }),
  }));
  await page.route("**/api/feedback", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: { feedbackId: "feedback-001", savedAt: "2026-07-28T00:00:00.000Z" },
      requestId,
    }),
  }));
}

async function seedPreferences(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("arknights-infra-calc-beta-onboarding-v1", "1");
  });
}

async function seedV4Session(page: Page) {
  await page.addInitScript(({ layout, result, savedAt, expiresAt }) => {
    window.localStorage.setItem("arknights-infra-calc-beta-onboarding-v1", "1");
    window.localStorage.setItem("arknights-infra-calc-session-v4", JSON.stringify({
      version: 4,
      savedAt,
      expiresAt,
      presetLabel: "243",
      layout,
      operbox: [{
        id: "char_002_amiya",
        name: "阿米娅",
        elite: 2,
        level: 80,
        own: true,
        potential: 6,
        rarity: 5,
      }],
      sourceName: "243 全精二示例",
      boxSource: "sample",
      layoutDirty: false,
      result,
      activeShift: 0,
    }));
  }, {
    layout: layout243,
    result: planData,
    savedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
}

test("restores a v4 schedule without hydration errors and keeps only safe data", async ({ page }) => {
  await mockApis(page);
  await seedV4Session(page);
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  await expect(page.getByText("明日方舟基建排班助手 · 243")).toBeVisible();
  await page.reload();
  await expect(page.getByText("排班已生成")).toBeVisible();
  expect(consoleErrors.filter((message) => /hydration|did not match/i.test(message))).toEqual([]);

  const persisted = await page.evaluate(() => JSON.parse(
    window.localStorage.getItem("arknights-infra-calc-session-v4") ?? "{}"
  ));
  expect(persisted.savedAt).toBeTruthy();
  expect(persisted.expiresAt).toBeTruthy();
  expect(persisted.result.debug).toBeUndefined();
  expect(JSON.stringify(persisted)).not.toContain("cliPath");
  expect(JSON.stringify(persisted)).not.toContain("stdout");
});

test("ignores root attributes injected by browser extensions during hydration", async ({ page }) => {
  await mockApis(page);
  await seedPreferences(page);
  await page.route("**/", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      /<html([^>]*)>/,
      '<html$1 data-fabric-scheme="dark">'
    );
    await route.fulfill({ response, body });
  });
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-fabric-scheme", "dark");
  expect(consoleErrors.filter((message) => /hydration|did not match/i.test(message))).toEqual([]);
});

test("?beta cannot enable debug tools without the server feature flag", async ({ page }) => {
  await mockApis(page, { debugTools: false });
  await seedPreferences(page);
  await page.goto("/?beta");
  await expect(page.getByText("排班服务已就绪")).toBeVisible();
  await expect(page.getByText("调试输出")).toHaveCount(0);
  await expect(page.getByText("问题上下文")).toHaveCount(0);
});

test("the server flag plus ?beta enables the debug panels", async ({ page }) => {
  await mockApis(page, { debugTools: true });
  await seedPreferences(page);
  await page.goto("/?beta");
  await expect(page.getByText("调试输出")).toBeVisible();
  await expect(page.getByText("问题上下文")).toBeVisible();
});

test("Full E2 stays in place and completes generation, shifts, MAA export, and feedback", async ({ page }) => {
  await mockApis(page);
  await seedPreferences(page);
  await page.goto("/");
  await expect(page.getByText("排班服务已就绪")).toBeVisible();

  const fullE2 = page.getByRole("button", { name: "载入 243 全精二测试干员数据" });
  await expect(fullE2).toBeVisible();
  await fullE2.click();
  await expect(page.getByText("先导入干员数据")).toHaveCount(0);

  await page.getByRole("button", { name: "生成排班" }).click();
  await expect(page.getByText("排班已生成")).toBeVisible();
  await page.getByRole("tab", { name: /β 6h/ }).click();
  await expect(page.getByText("固定测试班次 2")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出到 MAA" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("arknights-infra-schedule-maa.json");

  await page.getByRole("button", { name: "加工站 反馈排班问题" }).click();
  await page.getByPlaceholder(/这组应该换成/).fill("加工站排班与预期不一致");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "提交反馈" }).click();
  await expect(page.getByText("反馈已提交，编号：feedback-001")).toBeVisible();
});

test("responsive navigation and the two locked areas keep their current behavior", async ({ page }) => {
  await mockApis(page);
  await seedV4Session(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("tab", { name: "一图流布局" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "一图流布局" })).toBeDisabled();
  await expect(page.getByText("加工站")).toBeVisible();

  await page.getByRole("button", { name: /功能设施/ }).click();
  const keepHiddenButton = page.getByRole("button", { name: "暂不显示" });
  await expect(keepHiddenButton).toBeVisible();
  await keepHiddenButton.click();
  await expect(page.getByRole("button", { name: "恢复已隐藏（1）" })).toBeVisible();

  for (const viewport of [
    { width: 768, height: 900 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.reload();
    await expect(page.getByText("排班已生成")).toBeVisible();
    await expect(page.getByRole("button", { name: "载入 243 全精二测试干员数据" })).toBeVisible();
  }

  await expect(page.getByRole("button", { name: "基建计算器" })).toBeVisible();
  await expect(page.getByRole("button", { name: "练卡建议" })).toBeVisible();
  await expect(page.getByRole("button", { name: "森空岛状态" })).toBeVisible();
});

test("schedule visuals use the technical canvas, acrylic mesh, and responsive level markers", async ({ page }) => {
  await mockApis(page);
  await seedV4Session(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const canvas = page.locator("[data-infra-canvas]");
  const roomSurface = page.locator(".infra-room-surface").first();
  const listDiamonds = page.locator('.level-diamonds[data-variant="list"]').first();

  await expect(canvas).toBeVisible();
  await expect(roomSurface).toBeVisible();
  await expect(listDiamonds).toBeVisible();

  const visualStyles = await page.evaluate(() => {
    const room = document.querySelector<HTMLElement>(".infra-room-surface");
    if (!room) throw new Error("Missing room surface");
    const surface = getComputedStyle(room);
    const mesh = getComputedStyle(room, "::before");
    return {
      bodyFont: getComputedStyle(document.body).fontFamily,
      backdropFilter: surface.backdropFilter
        || (surface as CSSStyleDeclaration & { webkitBackdropFilter?: string }).webkitBackdropFilter,
      surfaceBackground: surface.backgroundColor,
      meshMask: mesh.maskImage || mesh.webkitMaskImage,
    };
  });
  expect(visualStyles.bodyFont).toContain("Noto Sans SC");
  expect(visualStyles.bodyFont).not.toContain("Segoe UI");
  expect(visualStyles.backdropFilter).toContain("blur(12px)");
  expect(visualStyles.surfaceBackground).toBe("rgb(39, 42, 43)");
  expect(visualStyles.meshMask).toContain("facility-grid.svg");

  const listBox = await listDiamonds.boundingBox();
  expect(listBox?.height).toBeCloseTo(20, 0);
  const listDiamondBox = await listDiamonds.locator(".level-diamond").first().boundingBox();
  expect(listDiamondBox?.width).toBeCloseTo(10, 0);

  await page.getByRole("tab", { name: "一图流布局" }).click();
  const compactDiamonds = page.locator('.level-diamonds[data-variant="compact"]').first();
  await expect(compactDiamonds).toBeVisible();
  const compactBox = await compactDiamonds.boundingBox();
  expect(compactBox?.height).toBeCloseTo(14, 0);
  const compactDiamondBox = await compactDiamonds.locator(".level-diamond").first().boundingBox();
  expect(compactDiamondBox?.width).toBeCloseTo(7.5, 0);

  await page.getByRole("tab", { name: "列表式布局" }).click();
  await page.setViewportSize({ width: 768, height: 900 });
  await expect(page.getByRole("tab", { name: "一图流布局" })).toBeDisabled();
  const tabletOperatorGrid = page.locator(".infra-list-operator-grid").first();
  await expect(tabletOperatorGrid).toBeVisible();
  const tabletGridSize = await tabletOperatorGrid.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(tabletGridSize.scrollWidth).toBeLessThanOrEqual(tabletGridSize.clientWidth);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("tab", { name: "一图流布局" })).toBeDisabled();
  const mobileDiamonds = page.locator('.level-diamonds[data-variant="list"]').first();
  await expect(mobileDiamonds).toBeVisible();
  const mobileBox = await mobileDiamonds.boundingBox();
  expect(mobileBox?.height).toBeCloseTo(16, 0);
  const mobileDiamondBox = await mobileDiamonds.locator(".level-diamond").first().boundingBox();
  expect(mobileDiamondBox?.width).toBeCloseTo(8, 0);
});

test("Skland login shows QR on every viewport and offers a separate mobile app shortcut", async ({ page }) => {
  await mockApis(page, { sklandConfigured: true });
  let qrStartRequests = 0;
  await page.route("**/api/skland/auth/qr", (route) => {
    qrStartRequests += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          scanId: "scan-login-1",
          scanUrl: "hypergryph://scan_login?scanId=scan-login-1&from=web",
          expiresInSeconds: 600,
        },
        requestId,
      }),
    });
  });
  await page.route("**/api/skland/auth/qr/status", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: { status: "waiting" },
      requestId,
    }),
  }));
  await seedPreferences(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  await expect(page.locator("header").getByRole("button", { name: "登录森空岛" })).toHaveCount(0);
  await page.getByRole("button", { name: "Toggle Sidebar" }).click();
  await page.getByRole("button", { name: "森空岛状态" }).click();
  await expect(page.getByRole("heading", { name: "把当前罗德岛带进排班助手" })).toBeVisible();
  await expect(page.getByText(/手机号|验证码|密码/)).toHaveCount(0);
  expect(qrStartRequests).toBe(0);

  await page.getByRole("button", { name: "生成登录二维码" }).click();
  await expect(page.getByRole("img", { name: "森空岛登录二维码" })).toBeVisible();
  await expect(page.getByRole("button", { name: "打开森空岛 App" })).toHaveAttribute(
    "href",
    "https://bbs.hycdn.cn/u-link/download.html?schema=skland%3A%2F%2FgameCenter"
  );
  await expect(page.getByText("按钮只负责打开 App。", { exact: false })).toBeVisible();

  await page.setViewportSize({ width: 1024, height: 800 });
  await expect(page.getByRole("img", { name: "森空岛登录二维码" })).toBeVisible();
  await expect(page.getByRole("button", { name: "打开森空岛 App" })).toBeHidden();
  expect(qrStartRequests).toBe(1);
});

test("Skland login waits for an explicit click and explains slow preparation", async ({ page }) => {
  await mockApis(page, { sklandConfigured: true });
  let qrStartRequests = 0;
  let releaseQr: (() => void) | undefined;
  const qrGate = new Promise<void>((resolve) => {
    releaseQr = resolve;
  });
  await page.route("**/api/skland/auth/qr", async (route) => {
    qrStartRequests += 1;
    await qrGate;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          scanId: "scan-login-slow",
          scanUrl: "hypergryph://scan_login?scanId=scan-login-slow",
          expiresInSeconds: 600,
        },
        requestId,
      }),
    });
  });
  await page.route("**/api/skland/auth/qr/status", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: { status: "waiting" },
      requestId,
    }),
  }));
  await seedPreferences(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  await page.getByRole("button", { name: "Toggle Sidebar" }).click();
  await page.getByRole("button", { name: "森空岛状态" }).click();
  expect(qrStartRequests).toBe(0);
  const generateButton = page.getByRole("button", { name: "生成登录二维码" });
  await generateButton.click();
  await expect(page.getByText("正在生成二维码…")).toBeVisible();
  await expect(page.getByText("正在连接鹰角登录服务，首次准备可能需要更久。")).toBeVisible({ timeout: 3_000 });
  expect(qrStartRequests).toBe(1);

  releaseQr?.();
  await expect(page.getByRole("img", { name: "森空岛登录二维码" })).toBeVisible();
  expect(qrStartRequests).toBe(1);
});

test("Skland status center keeps profile and recruitment in overview and supports role switching", async ({ page }) => {
  const switchedSnapshot = {
    ...authenticatedSklandSnapshot,
    player: {
      ...authenticatedSklandSnapshot.player,
      uid: "987654321",
      nickname: "测试博士二号",
    },
    sourceName: "森空岛同步",
  };
  let attendanceRequests = 0;
  page.on("request", (request) => {
    if (/attendance|sign/i.test(request.url())) attendanceRequests += 1;
  });
  await mockApis(page, {
    sklandConfigured: true,
    sklandSnapshot: authenticatedSklandSnapshot,
  });
  await page.route("**/api/skland/role", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: { "X-Request-Id": requestId },
    body: JSON.stringify({
      success: true,
      data: {
        authenticated: true,
        configured: true,
        authMethods: { qr: true },
        accounts: [{
          ...primarySklandAccount,
          selectedUid: switchedSnapshot.player.uid,
          roles: switchedSnapshot.roles,
        }],
        activeAccountId: primarySklandAccount.accountId,
        snapshot: switchedSnapshot,
      },
      requestId,
    }),
  }));
  await seedPreferences(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.getByRole("button", { name: "森空岛状态" }).click();

  await expect(page.getByRole("img", { name: "测试博士的森空岛头像" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "测试博士" }).first()).toBeVisible();
  await expect(page.getByText("UID 123••••789")).toBeVisible();
  await expect(page.getByRole("combobox")).toContainText("测试博士 · 官服");
  await expect(page.getByRole("combobox")).not.toContainText("123456789");
  await expect(page.getByRole("tab", { name: "概览", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "基建", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "干员", exact: true })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "进度", exact: true })).toHaveCount(0);
  await expect(page.getByText("当前理智")).toBeVisible();
  await expect(page.getByText("4 项状态提醒")).toBeVisible();
  await expect(page.getByText("博士档案", { exact: true })).toBeVisible();
  await expect(page.getByText("收藏概况", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "公开招募" })).toBeVisible();
  await expect(page.getByText("槽位 1")).toBeVisible();

  await page.getByRole("tab", { name: "基建", exact: true }).click();
  await expect(page.getByRole("heading", { name: "当前基建", exact: true })).toBeVisible();
  await expect(page.getByText("按计算器布局排列，快速核对进驻、心情与生产状态。", { exact: true })).toHaveCount(0);
  await expect(page.locator("[data-skland-compact-layout]")).toBeVisible();
  await expect(page.getByRole("heading", { name: "控制中枢", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "贸易站 1", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "制造站 1", exact: true })).toBeVisible();
  await expect(page.locator(".infra-room-surface").first()).toBeVisible();
  await expect(page.locator('.level-diamonds[data-variant="compact"]').first()).toBeVisible();
  await expect(page.locator(".infra-operator-slot").first()).toBeVisible();
  await expect(page.getByRole("img", { name: "阿米娅" })).toBeVisible();
  await expect(page.getByText("氛围 5000", { exact: true })).toBeVisible();
  await expect(page.getByText("宿舍氛围 5000", { exact: true })).toHaveCount(0);
  await expect(page.getByText("当前进驻", { exact: true })).toHaveCount(0);
  await expect(page.getByText("设施运行正常", { exact: true })).toHaveCount(0);
  await expect(page.locator("[data-infra-complete-time]").first()).toHaveText(/^\d{4}\.\d{1,2}\.\d{1,2} \d{2}:\d{2}$/);
  await expect(page.getByText(/已有 4 · 待接收 2/)).toBeVisible();

  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: "测试博士二号 · B服" }).click();
  await expect(page.getByRole("heading", { name: "测试博士二号" }).first()).toBeVisible();
  await expect(page.getByRole("img", { name: "测试博士二号的森空岛头像" })).toBeVisible();
  await expect(page.getByRole("button", { name: "刷新" })).toHaveCount(0);

  await expect.poll(async () => page.evaluate(() => JSON.stringify(localStorage))).not.toContain("987654321");
  const persisted = await page.evaluate(() => JSON.stringify(localStorage));
  expect(persisted).not.toContain("为了更好的明天");
  expect(persisted).not.toContain('"progress"');

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 900 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(viewport);
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  }

  await page.getByRole("button", { name: "退出" }).click();
  await expect(page.getByRole("heading", { name: "把当前罗德岛带进排班助手" })).toBeVisible();
  expect(attendanceRequests).toBe(0);
});

test("Skland supports adding, switching, and individually logging out multiple accounts", async ({ page }) => {
  const secondarySnapshot = {
    ...authenticatedSklandSnapshot,
    player: {
      ...authenticatedSklandSnapshot.player,
      uid: "246813579",
      nickname: "第二账号博士",
      channelName: "官服",
    },
    roles: [{
      uid: "246813579",
      nickname: "第二账号博士",
      channelName: "官服",
      isDefault: true,
    }],
  };
  const secondaryAccount = {
    accountId: "account_secondary",
    selectedUid: secondarySnapshot.player.uid,
    roles: secondarySnapshot.roles,
  };
  let currentSnapshot = authenticatedSklandSnapshot;
  let currentAccounts = [primarySklandAccount];
  let currentAccountId: string | null = primarySklandAccount.accountId;

  await mockApis(page, {
    sklandConfigured: true,
    sklandSnapshot: authenticatedSklandSnapshot,
  });
  await page.route("**/api/skland/session", async (route) => {
    if (route.request().method() === "DELETE") {
      const body = route.request().postDataJSON() as { accountId?: string } | null;
      currentAccounts = currentAccounts.filter((account) => account.accountId !== body?.accountId);
      if (currentAccounts.length) {
        const nextAccount = currentAccounts[0];
        currentAccountId = nextAccount.accountId;
        currentSnapshot = nextAccount.accountId === secondaryAccount.accountId
          ? secondarySnapshot
          : authenticatedSklandSnapshot;
      } else {
        currentAccountId = null;
      }
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "X-Request-Id": requestId },
      body: JSON.stringify({
        success: true,
        data: {
          authenticated: currentAccounts.length > 0,
          configured: true,
          authMethods: { qr: true },
          accounts: currentAccounts,
          activeAccountId: currentAccountId,
          ...(currentAccounts.length ? { snapshot: currentSnapshot } : {}),
        },
        requestId,
      }),
    });
  });
  await page.route("**/api/skland/auth/qr", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: { "X-Request-Id": requestId },
    body: JSON.stringify({
      success: true,
      data: {
        scanId: "scan-second-account",
        scanUrl: "hypergryph://scan_login?scanId=scan-second-account",
        expiresInSeconds: 600,
      },
      requestId,
    }),
  }));
  await page.route("**/api/skland/auth/qr/status", (route) => {
    currentAccounts = [primarySklandAccount, secondaryAccount];
    currentAccountId = secondaryAccount.accountId;
    currentSnapshot = secondarySnapshot;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "X-Request-Id": requestId },
      body: JSON.stringify({
        success: true,
        data: {
          status: "authenticated",
          accounts: currentAccounts,
          activeAccountId: currentAccountId,
          snapshot: currentSnapshot,
        },
        requestId,
      }),
    });
  });
  await page.route("**/api/skland/role", async (route) => {
    const body = route.request().postDataJSON() as { accountId: string; uid: string };
    const selectedAccount = currentAccounts.find((account) => account.accountId === body.accountId);
    currentAccountId = body.accountId;
    currentSnapshot = body.accountId === secondaryAccount.accountId
      ? secondarySnapshot
      : {
          ...authenticatedSklandSnapshot,
          player: {
            ...authenticatedSklandSnapshot.player,
            uid: body.uid,
            nickname: selectedAccount?.roles.find((role) => role.uid === body.uid)?.nickname ?? "测试博士",
          },
        };
    currentAccounts = currentAccounts.map((account) => account.accountId === body.accountId
      ? { ...account, selectedUid: body.uid }
      : account);
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "X-Request-Id": requestId },
      body: JSON.stringify({
        success: true,
        data: {
          authenticated: true,
          configured: true,
          accounts: currentAccounts,
          activeAccountId: currentAccountId,
          snapshot: currentSnapshot,
        },
        requestId,
      }),
    });
  });

  await seedPreferences(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.getByRole("button", { name: "森空岛状态" }).click();

  const topAvatar = page.locator("[data-skland-top-avatar]");
  const accountSelect = page.locator("[data-skland-account-select]");
  const addAccount = page.locator("[data-skland-add-account]");
  const logout = page.locator("[data-skland-logout]");
  await expect(topAvatar).toBeVisible();
  await expect.poll(() => topAvatar.evaluate((element) => getComputedStyle(element).borderRadius)).not.toBe("9999px");
  const controlHeights = await Promise.all([
    accountSelect.evaluate((element) => element.getBoundingClientRect().height),
    addAccount.evaluate((element) => element.getBoundingClientRect().height),
    logout.evaluate((element) => element.getBoundingClientRect().height),
  ]);
  expect(new Set(controlHeights)).toEqual(new Set([44]));
  await expect(logout).toHaveClass(/text-destructive/);

  await addAccount.click();
  await expect(page.getByRole("heading", { name: "添加森空岛账号" })).toBeVisible();
  await page.getByRole("button", { name: "生成登录二维码" }).click();
  await expect(page.getByRole("heading", { name: "第二账号博士" }).first()).toBeVisible({ timeout: 12_000 });

  await accountSelect.click();
  await expect(page.getByText("森空岛账号 1 · 测试博士", { exact: true })).toBeVisible();
  await expect(page.getByText("森空岛账号 2 · 第二账号博士", { exact: true })).toBeVisible();
  await page.getByRole("option", { name: "测试博士 · 官服" }).click();
  await expect(page.getByRole("heading", { name: "测试博士" }).first()).toBeVisible();

  await logout.click();
  await expect(page.getByRole("heading", { name: "第二账号博士" }).first()).toBeVisible();
  await logout.click();
  await expect(page.getByRole("heading", { name: "把当前罗德岛带进排班助手" })).toBeVisible();

  const persisted = await page.evaluate(() => JSON.stringify(localStorage));
  expect(persisted).not.toContain(primarySklandAccount.accountId);
  expect(persisted).not.toContain(secondaryAccount.accountId);
  expect(persisted).not.toContain(secondarySnapshot.player.uid);
});

test("Skland disables adding another account after five accounts", async ({ page }) => {
  const accounts = Array.from({ length: 5 }, (_, index) => ({
    ...primarySklandAccount,
    accountId: `account_limit_${index}`,
  }));
  await mockApis(page, {
    sklandConfigured: true,
    sklandSnapshot: authenticatedSklandSnapshot,
    sklandAccounts: accounts,
    activeAccountId: accounts[0].accountId,
  });
  await seedPreferences(page);
  await page.goto("/");
  await page.getByRole("button", { name: "森空岛状态" }).click();

  const addAccount = page.locator("[data-skland-add-account]");
  await expect(addAccount).toBeDisabled();
  await expect(addAccount).toHaveAttribute("title", "最多可登录 5 个森空岛账号");
});

test("setup routes Skland account actions to the status center", async ({ page }) => {
  await mockApis(page, {
    sklandConfigured: true,
    sklandSnapshot: authenticatedSklandSnapshot,
  });
  await seedPreferences(page);
  await page.goto("/");

  await page.getByRole("button", { name: "配置干员数据与布局" }).first().click();
  await page.getByRole("tab", { name: /导入干员数据/ }).click();
  await page.getByRole("tab", { name: "森空岛同步" }).click();
  await expect(page.getByText(/测试博士/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "前往森空岛状态" })).toBeVisible();
  await expect(page.getByRole("button", { name: "使用当前干员数据" })).toHaveCount(0);
  await page.getByRole("button", { name: "前往森空岛状态" }).click();
  await expect(page.getByRole("heading", { name: "测试博士" }).first()).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("settings clears local product data without logging out of Skland", async ({ page }) => {
  await mockApis(page);
  await seedV4Session(page);
  let logoutRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/skland/session") && request.method() === "DELETE") {
      logoutRequests += 1;
    }
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByRole("button", { name: "配置干员数据与布局" }).click();
  await page.getByRole("tab", { name: /导入干员数据/ }).click();
  const storageCopy = page.getByText(/会在此浏览器保存 30 天/);
  await storageCopy.scrollIntoViewIfNeeded();
  await expect(storageCopy).toBeVisible();
  await page.getByRole("button", { name: "清除本地数据" }).first().click();
  await expect(page.getByRole("heading", { name: "清除本地数据？" })).toBeVisible();
  await page.getByRole("button", { name: "清除本地数据" }).last().click();

  const stored = await page.evaluate(() => ({
    v2: window.localStorage.getItem("arknights-infra-calc-beta-session-v2"),
    v3: window.localStorage.getItem("arknights-infra-calc-beta-session-v3"),
    v4: window.localStorage.getItem("arknights-infra-calc-session-v4"),
    onboarding: window.localStorage.getItem("arknights-infra-calc-beta-onboarding-v1"),
  }));
  expect(stored).toEqual({ v2: null, v3: null, v4: null, onboarding: null });
  expect(logoutRequests).toBe(0);
});
