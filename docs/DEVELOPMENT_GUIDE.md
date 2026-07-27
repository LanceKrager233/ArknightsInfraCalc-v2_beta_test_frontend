# Arknights InfraCalc Beta 前端开发指南

## 快速概览

明日方舟基建自动排班 Web 应用（Beta 测试验收台）。用户导入干员 Box（森空岛扫码 / MAA JSON / XLSX / 样例），配置基建布局（房间类型、等级、产品），由 Rust CLI 求解器生成三班排班，在主界面展示房间效率、干员分配，并支持导出 MAA 一键作业。

## 技术栈

| 层 | 技术 |
|---|------|
| 框架 | Next.js 16 (App Router) + webpack |
| UI | React 19 + TypeScript 5.7 |
| 样式 | Tailwind CSS v4 + shadcn/ui (`base-nova` 风格) |
| 图标 | Lucide React |
| 组件 | shadcn/ui (Button, Dialog, Tabs, Sidebar, ScrollArea 等) |
| 求解器 | Rust `infra-cli serve` 子进程，stdin/stdout NDJSON 协议 |
| 认证 | 森空岛 OAuth (skland-kit SDK)，AES-256-GCM cookie 加密 |
| 包管理 | npm |

## 目录结构

```
src/
├── App.tsx                         # 全局状态 + 布局壳（~900行，待拆 hook）
├── api.ts                          # 前端 fetch 封装（runPlan, getHealth, ...）
├── blueprint.ts                    # 布局预设、房间等级、产品切换、发电量校验
├── schedule.ts                     # MAA 排班 → RoomRow 转换、房间分组
├── efficiency.ts                   # 效率数据展示（字段归一化、格式化为 UI 文本）
├── types.ts                        # 所有 TypeScript 类型（BaseBlueprint, RoomRow, MaaPlan 等）
├── setup-dialog.tsx                # "配置 Box 与布局"弹窗（Box 导入 + 布局编辑器）
├── components.tsx                  # 通用 UI 组件（ScheduleBoard, Panel, OperatorSlot 等）
├── operatorPortraits.ts            # 干员名 → 头像 URL 映射
├── operbox.ts                      # 干员 Box 文件解析（JSON, XLSX）
├── download.ts                     # JSON 下载 + 剪贴板复制
├── onboarding.ts                   # 首次使用引导逻辑
├── skland.ts                       # 森空岛数据对比
├── skland-components.tsx           # 森空岛 UI（登录弹窗、基建快照、对比卡片）
│
├── app/
│   ├── layout.tsx                  # 根布局（TooltipProvider）
│   ├── page.tsx                    # 入口页（渲染 WorkbenchApp）
│   ├── globals.css                 # Tailwind + CSS 变量
│   └── api/                        # Next.js API Routes
│       ├── health/route.ts         # GET CLI 状态
│       ├── plan/route.ts           # POST 排班求解
│       ├── sample-operbox/route.ts # GET 样例 Box
│       ├── feedback/route.ts       # POST 提交反馈
│       └── skland/                 # 森空岛 OAuth 相关
│
├── layouts/                        # 5 个布局预设 JSON（153/243/252/333/342）
├── server/
│   ├── infra.ts                    # CLI 进程管理、plan.compute 请求/响应处理
│   ├── plan-protocol.ts            # plan.compute 协议能力检测、响应解析
│   └── skland/                     # 森空岛认证后端（session, adapter, normalize）
│
├── components/
│   ├── ui/                         # shadcn/ui 组件（select, sidebar, dialog, tabs, ...）
│   ├── pages/                      # 三个子页面
│   │   ├── InfraCalculator.tsx     # 基建计算器（排班展示主界面）
│   │   ├── TrainingAdvice.tsx      # 练卡建议（占位）
│   │   └── SklandStatus.tsx        # 森空岛基建状态
│   ├── layout/
│   │   └── AppSidebar.tsx          # 侧边栏导航（3 项 + 折叠按钮）
│   └── CompactScheduleView.tsx     # 一图流排班视图组件
│
└── public/
    └── images/                     # 房间背景 webp、干员头像
```

## 数据流

```
用户操作
  │
  ├─ 导入 Box ──→ operbox state (App.tsx)
  │   ├─ 森空岛扫码 → server/skland/ → skland-kit SDK → HyberGryph API
  │   ├─ MAA JSON 上传 → operbox.ts 解析
  │   ├─ XLSX 上传 → operbox.ts 解析
  │   └─ 样例 → getSampleOperbox()
  │
  ├─ 配置布局 ──→ layout/preset state (App.tsx)
  │   └─ SetupDialog (setup-dialog.tsx)
  │       ├─ 预设切换 → blueprint.ts buildBlueprint()
  │       ├─ 房间等级 → blueprint.ts updateRoomLevel()
  │       ├─ 产品切换 → blueprint.ts updateFactoryRecipe/TradeOrder()
  │       └─ 发电校验 → blueprint.ts computePowerBudget()
  │
  └─ 点击"生成排班" ──→ handleRun() (App.tsx)
      │
      ├─ fetch POST /api/plan { layout, operbox, sourceName }
      │   └─ server/infra.ts: runPlan()
      │       ├─ 去重 operbox name（同名保留第一个，删除后续）
      │       ├─ 求解完成后回写布局产品（"自动选择" → CLI 实际选定的配方）
      │       ├─ 组装 plan.compute v1 请求参数
      │       └─ 通过 stdin/stdout 发给 infra-cli serve 子进程
      │
      ├─ CLI 返回 ──→ PlanApiResponse { profileJson, maaJson, rotationJson }
      │   │
      │   ├─ profileJson (BoxProfile v4)
      │   │   ├─ domains[] 差距分析（当前 Box vs 最优解）→ 练卡建议页
      │   │   ├─ actions[] 具体练卡行动（P0/P1/P2 优先级）→ 练卡建议页
      │   │   └─ rotation.daily_* 日产量 → 状态栏展示
      │   │
      │   ├─ maaJson (MaaSchedule)
      │   │   └─ plans[] 三班排班，rooms.trading/manufacture/... → ScheduleBoard
      │   │
      │   └─ rotationJson (RotationSummary)
      │       ├─ daily { trade, manufacture, power } → 日产量
      │       └─ shifts[] → planToRows() → RoomRow[] → ScheduleBoard
      │
      └─ 前端渲染
          ├─ planToRows (schedule.ts): MaaPlan + shift → RoomRow[]
          ├─ ScheduleBoard (components.tsx): 房间分组 → 房间卡片 → 干员槽位
          └─ presentRoomEfficiency (efficiency.ts): RoomEfficiency → 展示文本
```

### plan.compute v1 协议

前端 ↔ CLI 通过 `server/infra.ts` 通信，method 为 `"plan.compute"`。

**请求**（内联 JSON，不写文件）：
```json
{
  "schema_version": 1,
  "layout": { "template": "243", "rooms": [...], "scenario": {...} },
  "operbox": [{ "id": "char_...", "name": "12F", "elite": 2, ... }],
  "labels": { "layout": "243", "operbox": "Full E2" },
  "options": { "rotation": "abc_12_6_6", "top": 20, "maa_title": "..." }
}
```

**响应**：
```json
{
  "ok": true,
  "result": {
    "schema_version": 1,
    "profile": { "domains": [...], "actions": [...], "rotation": {...} },
    "rotation": { "daily": {...}, "shifts": [...] },
    "maa": { "plans": [...] }
  }
}
```

**关键转换**（`server/infra.ts` 中 `rotationShiftsFromServeNew` + `normalizeRoomLine`）：
- shift 层级：`efficiencies` → `scores`
- room_line 字段：`trade_efficiency` → `trade_score`, `trade_skill_efficiency` → `trade_skill_pct ×100`
- operbox 去重：`runPlan()` 发请求前 filter 同名干员，保留第一个删除后续
- plan.compute 协议链路：`inspectPlanComputeCapability()` 探测 CLI 能力 → `parsePlanComputePayload()` 解析响应
- SHA-256 契约校验暂时关闭（CLI 更新后恢复）

## 核心模块详解

### App.tsx（状态中枢）

全局状态（30+ useState，待拆 hook）：

| 分类 | State | 说明 |
|------|-------|------|
| 页面导航 | `page` | `"calculator"` / `"training"` / `"skland"` |
| Box 数据 | `operbox`, `fileName`, `boxSource`, `inputMode` | 干员 Box 来源 |
| 布局配置 | `layout`, `preset`, `layoutDirty` | 当前基建设施布局 |
| 电力校验 | `powerBudget` | `computePowerBudget(layout)` 实时计算 |
| 求解结果 | `result`, `loading`, `apiError` | CLI 求解状态 |
| 排班显示 | `activeShift`, `scheduleResult` | 当前显示哪个班次 |
| Skland | `sklandSnapshot`, `sklandConfigured`, `sklandBusy` | 森空岛登录状态 |
| 弹窗 | `setupOpen`, `sklandAccountOpen`, `issueOpen` | 配置/登录/反馈弹窗 |
| 反馈 | `issueDraftRow`, `feedbackResult` | 问题标记与提交 |

关键 handler：
- `handleRun()` — 发起排班求解
- `handleInfraCalcComplete(result)` — CLI 返回后写回干员分配 + 效率
- `handleLoadSample()` — 载入 243 Full E2 样例 Box
- `handlePresetSelect()` / `handleRoomLevelChange()` — 布局变更
- Skland 系列 handler — 森空岛登录/刷新/登出

### blueprint.ts（布局与电力）

核心函数：

| 函数 | 说明 |
|------|------|
| `buildBlueprint(preset)` | 深拷贝预设 JSON 得到初始 layout |
| `updateRoomLevel(layout, roomId, level)` | 修改房间等级（1-3 或 1-5） |
| `updateFactoryRecipe(layout, roomId, recipe)` | 修改制造站产品（all / gold / battle_record / originium） |
| `updateTradeOrder(layout, roomId, order)` | 修改贸易站订单（gold / originium） |
| `factoryRecipeFromMaaProduct(product)` | MAA 产品名 → recipe（"Pure Gold" → "gold"），求解后回写布局用 |

**制造站配方**：新增 `"all"`（自动选择），求解器自行决定最优配方。求解完成后 `handleRun()` 回写布局，按钮自动切换为 CLI 实际选择的配方。列表式中用 `ProductToggleGroup` 按钮组（`grid-cols-2`），一图流中用 shadcn `<Select>` 下拉。
| `computePowerBudget(layout)` | 发电量校验，返回 `{ ok, generated, consumed }` |
| `roomKindLabel(kind)` | 房间类型中文名（"制造站"等） |
| `maxRoomLevel(kind)` | 房间最大等级（中枢/宿舍 = 5，其他 = 3） |
| `roomSummary(layout)` | 布局摘要文本（"2 贸易 / 5 制造 / 2 发电"） |

**发电量数据**：`POWER_OUTPUT` / `POWER_CONSUMPTION` 表，训练室不在布局 JSON 里但算进消耗（默认满级 60）。

### schedule.ts（排班数据转换）

核心函数：

| 函数 | 说明 |
|------|------|
| `planToRows(plan, shift, layout)` | MAA 三班排班 → `RoomRow[]`（含效率、产品、干员槽位） |
| `efficiencyMapFor(shift)` | 从 shift 的 `scores.room_lines` 构建 room_id → RoomEfficiency 映射 |
| `BLUEPRINT_GROUP` | `RoomKind → RoomGroup` 映射（trading, manufacture, power 等） |
| `GROUP_ORDER` | 房间分组显示顺序 |
| `roomOperatorSlots(room)` | MAA room → 干员头像/名字槽位数组 |

**注意**：`schedule.ts` 里的 `RoomRow` 是 UI 渲染的核心数据结构，包含 `title`（房间名）、`group`（分组）、`efficiency`（效率对象）、`operatorSlots`（干员槽位数组）、`product`（产品中文名）。

### efficiency.ts（效率展示）

| 函数 | 说明 |
|------|------|
| `normalizeServeRoomEfficiency(line)` | 新协议 room_line → 前端 `RoomEfficiency` 类型（字段名 + ×100 转换） |
| `presentRoomEfficiency(group, efficiency)` | `RoomEfficiency` → UI 展示文本（主值 + 细节列表） |

**注意**：`normalizeServeRoomEfficiency` 在前端 `efficiency.ts` 中定义了，但实际转换在 `server/infra.ts` 里重复实现了一份（`normalizeRoomLine`），因为 server 端不能引用客户端模块。

### components.tsx（通用 UI 组件）

| 组件 | 位置 | 说明 |
|------|------|------|
| `ScheduleBoard` | ~831 行 | 排班展示面板。支持列表/一图流切换，按房间类型分组渲染 |
| `OperatorSlot` | ~781 行 | 单个干员槽位（头像在上、名字在下，白字无背景） |
| `LayoutEditor` | ~231 行 | 配置弹窗中的布局编辑器（等级、产品、预设选择） |
| `Panel` | ~132 行 | 通用分区面板（标题 + 图标 + 内容 + 操作按钮） |
| `StatusBar` | ~458 行 | Header 状态栏（运行耗时、错误信息） |
| `RunButton` | ~530 行 | "生成排班"按钮 |
| `LevelDiamonds` | ~659 行 | 等级菱形图形（1-5 个菱形 + Lv.N 文字） |
| `RoomEfficiencyReadout` | ~678 行 | 效率大字展示（含跨设施标注） |
| `RoomProductControls` | ~722 行 | 房间产品切换按钮组（ToggleGroup） |
| `CompactScheduleView` | 独立文件 | 一图流排班视图。仅 PC 端（≥1024px）可用，按布局规则分组排列 |

**注意**：`ProductToggleGroup`、`OperatorSlot`、`RoomEfficiencyReadout`、`RoomProductControls`、`roomVisualFor` 已 export，`CompactScheduleView` 可直接 import 复用。

### CompactScheduleView（一图流布局）

仅 PC 端可用（`< 1024px` 时按钮禁用且自动切回列表式）。按发电站数量（2 或 3）自动选择布局。

**组件接口**：接收 `rows`、`layout`、`currentMoraleByOperator`、`activeShift`、`activePlan`、`onIssue`，不再接收产品变更回调（一图流为只读展示）。

**Grid 两列布局**：

```
┌──────────────────────┬──────────────────┐
│      控制中枢         │ 会客室 办公室     │  ← Row 1
│                      │ 加工站           │
├──────────────────────┼──────────────────┤
│  工作站1  │  工作站2   │      宿舍        │  ← Row 2-4
├──────────────────────┼──────────────────┤
│  发电1│发电2│发电3    │      宿舍        │  ← Row 5 (3电)
│  发电1│发电2│工作站    │      宿舍        │  ← Row 5 (2电)
└──────────────────────┴──────────────────┘
```

**宽度配置**（[CompactScheduleView.tsx](src/components/CompactScheduleView.tsx) 顶部）：

| 常量 | 默认值 | 说明 |
|------|-------|------|
| `GRID_LEFT_PCT` | 55% | 左大列宽度 |
| `GRID_RIGHT_PCT` | 45% | 右大列宽度 |

单元格内子卡片宽度通过 `makeCard(row, widthPercent)` 第二个参数手动控制。不传则 `flex: 1` 自动均分。

**房间卡片**（`CompactRoomCard`）：

```
┌──────────────────────┐
│ ▌ 名称 Lv.3 [龙门商法]│  ← 名称+等级+只读产品标签
│ 190% / 纯技能 80%... │  ← 效率行
│ [干员1][干员2][干员3] │  ← 槽位 grid
└──────────────────────┘
```

- 产品标签为只读 `<div>`，非交互 Select，与按钮相同的配色（蓝/黄/红/默认）
- 卡片内部 `justify-center` 垂直居中，同行被拉高时内容不堆顶
- 槽位数同列表式

**房间卡片的结构**（在 `ScheduleBoard` 内部渲染，未抽成独立组件）：
```
┌──────────────────────────────────────────────┐
│ [背景图 + 半透明遮罩]  │ 房间名  ◆◆◆ Lv.3 │  ← 左侧 260px
│                        │ 效率 105% 纯技能    │
│                        │ [自动选择][贵金属]  │  ← 产品切换(grid-cols-2)
│                        ├────────────────────┤
│                        │ [干员1][干员2][空]  │  ← 右侧干员槽位
└──────────────────────────────────────────────┘
```

左面板宽度规则：
- 默认（贸易站、制造站）：`260px`
- 紧凑型（发电站、办公室、加工站）：`210px`
- 窄面板（控制中枢、宿舍）：`240px`
- 会客室：`360px`

功能设施（办公室、会客室、发电站、加工站）使用紧凑卡片样式（112px 高）。干员槽位 PC 端 `clamp(70px, 7.3vw, 88px)`，移动端 `clamp(56px, 16vw, 76px)`。

### operbox.ts（干员 Box 解析与校验）

核心函数：

| 函数 | 说明 |
|------|------|
| `assertOperbox(value)` | 校验 JSON 数组并返回 `OperBoxEntry[]` |
| `readOperboxText(text)` | 解析 MAA JSON 字符串 |
| `readOperboxFile(file)` | 解析 JSON / XLSX 文件 |

**校验规则**（`assertOperbox()`）：

| 字段 | 规则 |
|------|------|
| `id` | 非空字符串，全局唯一 |
| `name` | 非空字符串 |
| `elite` | `own: true` → 0-2 整数；`own: false` → 可为 0 不报错 |
| `level` | `own: true` → 1-90 整数；`own: false` → 可为 0 不报错 |
| `own` | 必须是布尔值（XLSX 通过 `boolValue()` 转换：`false`/`"false"`/`0` 以外均为 `true`） |
| `potential` | 1-6 整数 |
| `rarity` | 1-6 整数 |

### setup-dialog.tsx（配置弹窗）

两个 Tab："导入 Box" 和 "配置基建"。

- **导入 Box**：森空岛扫码 / MAA 文件上传 / MAA JSON 粘贴 / 样例 Box
- **配置基建**：预设选择 + 布局编辑器（LayoutEditor 组件） + 发电量实时显示

### AppSidebar.tsx（侧边栏）

位于 `src/components/layout/AppSidebar.tsx`。使用 shadcn `<Sidebar collapsible="icon">`。

三个导航项：基建计算器 / 练卡建议 / 森空岛状态。移动端自动切 offcanvas 模式。

### server/infra.ts（CLI 通信层）

**最重要**的文件——所有 CLI 交互在这里：

| 函数 | 说明 |
|------|------|
| `runPlan(body)` | 入口：接收 `{ layout, operbox, sourceName }`，去重后返回 `PlanApiResponse` |
| `getServeClient().send(method, params)` | 发 NDJSON 请求给 CLI 子进程 |
| `resolveCliPath()` | 查找 `infra-cli` 二进制路径 |
| `rotationShiftsFromServeNew()` | 新协议 shifts 格式转换 |
| `normalizeRoomLine()` | 新协议 room_line 字段 → 前端 RoomEfficiency 格式 |
| `buildRotationJson()` | 组装 rotationJson（shifts + daily） |

**operbox 去重**：在 `runPlan()` 内发请求前执行。`filter` 遍历 operbox，同名干员保留第一个，删除后续。plan.compute 和 legacy 两条协议路径均覆盖。

**operbox 校验规则**（`assertOperbox()`）：`own: false` 时 `elite`/`level` 可为 0 不报错。`own` 先于 `elite`/`level` 校验，未拥有干员不检查练度。

### 新增功能的修改指南

| 要改什么 | 在哪里改 |
|---------|---------|
| 房间卡片样式 | `components.tsx` → `ScheduleBoard` 内 ~976 行的 `<div>` |
| 干员槽位样式 | `components.tsx` → `OperatorSlot` 组件（781 行） |
| 房间等级/产品编辑 | `components.tsx` → `LayoutEditor`（231 行） |
| 发电量规则 | `blueprint.ts` → `computePowerBudget` 内的 `POWER_CONSUMPTION` 表 |
| 新增产品类型 | `types.ts` ProductKind → `blueprint.ts` options → `layoutConverter.ts`（不再使用） |
| CLI 协议变更 | `server/infra.ts` → `runPlan()` + `rotationShiftsFromServeNew()` |
| 侧边栏内容 | `AppSidebar.tsx` → 三个 `SidebarMenuButton` |
| 练卡建议页 | `TrainingAdvice.tsx`（数据源：`scheduleResult.profileJson`） |
| 一图流布局 | `CompactScheduleView.tsx`——两列 Grid，宽度百分比可配，产品只读展示 |
| 森空岛状态页 | `SklandStatus.tsx` |
| Header 响应式 | `App.tsx` ~750 行的 `<header>` |
| 全局状态 | `App.tsx` → 待拆成 `useSklandAuth` / `useLayoutConfig` / `usePlanRunner` |

## App.tsx 臃肿问题

当前 900+ 行，30 个 useState，原因：
1. 所有状态未抽成自定义 hook（Skland / 布局 / 求解各 ~8 个 state）
2. 工具函数堆在文件底部（session 持久化、onboarding、issue 报告）
3. `operbox`、`layout`、`preset`、skland 数据被 header、配置弹窗、三个子页面共用

**精简路线**：抽 `useSklandAuth` / `useLayoutConfig` / `usePlanRunner` 三个 hook，App.tsx 剩 ~400 行布局壳。
