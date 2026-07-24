import { ArrowUpRight, CircleDollarSign, Zap } from "lucide-react";

import { operatorPortraitFor } from "@/operatorPortraits";
import type { BaseBlueprint, OperBoxEntry, PlanComputeParams } from "@/types";

type AdviceCategory = "trade" | "gold" | "record" | "orundum" | "clue" | "support";

type ComboAdvice = {
  title: string;
  category: AdviceCategory;
  room: string;
  efficiency: string;
  operators: string[];
  note: string;
  priority: "核心" | "高" | "中";
};

const CATEGORY_META: Record<AdviceCategory, { label: string; accent: string; level: string; bg: string; text: string }> = {
  trade: { label: "贸易站", accent: "#29BDF5", level: "#29BDF5", bg: "/images/room/trading.svg", text: "text-sky-300" },
  gold: { label: "制造赤金", accent: "#FFD501", level: "#FFD501", bg: "/images/room/manufacture.svg", text: "text-yellow-200" },
  record: { label: "作战记录", accent: "#4AA3FF", level: "#FFD501", bg: "/images/room/manufacture.svg", text: "text-blue-200" },
  orundum: { label: "原石碎片", accent: "#B01F2B", level: "#FFD501", bg: "/images/room/manufacture.svg", text: "text-red-200" },
  clue: { label: "会客线索", accent: "#9BEC3A", level: "#FFFFFF", bg: "/images/room/meeting.svg", text: "text-lime-200" },
  support: { label: "辅助设施", accent: "#9BEC3A", level: "#9BEC3A", bg: "/images/room/power.svg", text: "text-lime-200" },
};

const RECOMMENDED_COMBOS: ComboAdvice[] = [
  {
    title: "巫恋龙舌兰裁缝 beta",
    category: "trade",
    room: "贸易站",
    efficiency: "138% 贸易 + 46% 赤金",
    operators: ["巫恋", "龙舌兰", "柏喙", "卡夫卡", "明椒", "折光"],
    note: "贸易幻神组，裁缝 beta 需要约 5h 暖机，三者缺一不可。",
    priority: "核心",
  },
  {
    title: "巫恋龙舌兰但书",
    category: "trade",
    room: "贸易站",
    efficiency: "178% 贸易 + 33.5% 赤金",
    operators: ["巫恋", "龙舌兰", "但书"],
    note: "但书是乘区角色，3 级贸易站但书 II 约 1.55 倍率，适合优先补精二。",
    priority: "核心",
  },
  {
    title: "但书可露希尔乘区",
    category: "trade",
    room: "贸易站",
    efficiency: "等效最高约 301%",
    operators: ["但书", "可露希尔", "绮良", "鸿雪", "图耶"],
    note: "固定赤金订单收益线，90% 档约等效 135% 贸易 + 42% 赤金。",
    priority: "高",
  },
  {
    title: "推进之王摩根维娜",
    category: "trade",
    room: "贸易站",
    efficiency: "135% / 等效约 208%",
    operators: ["推进之王", "摩根", "维娜·维多利亚", "戴菲恩"],
    note: "配中枢戴菲恩时收益更完整；没有维娜也可先做推进之王 + 摩根。",
    priority: "高",
  },
  {
    title: "伺夜贝洛内",
    category: "trade",
    room: "贸易站",
    efficiency: "90%~98%",
    operators: ["伺夜", "贝洛内", "八幡海铃"],
    note: "常见叙拉古贸易线，八幡海铃中枢可进一步抬收益。",
    priority: "中",
  },
  {
    title: "蕾缪安能天使",
    category: "trade",
    room: "贸易站",
    efficiency: "80%~87%",
    operators: ["蕾缪安", "能天使"],
    note: "企鹅物流贸易线，适合和德克萨斯、拉普兰德等补位搭配。",
    priority: "中",
  },
  {
    title: "德克萨斯拉普兰德",
    category: "trade",
    room: "贸易站",
    efficiency: "65% / 81%",
    operators: ["德克萨斯", "拉普兰德"],
    note: "基础好用的双人贸易组合，精二后记录可到 81%。",
    priority: "中",
  },
  {
    title: "清流发电联动",
    category: "gold",
    room: "制造站 赤金",
    efficiency: "20% x 发电站数量",
    operators: ["清流", "温蒂", "森蚺", "承曦格雷伊"],
    note: "赤金制造常用联动；发电站数量越多越强，适合 243/333 等布局关注。",
    priority: "高",
  },
  {
    title: "红云稀音帕拉斯",
    category: "record",
    room: "制造站 作战记录",
    efficiency: "39% -> 49% / 41%",
    operators: ["红云", "稀音", "帕拉斯", "刻俄柏"],
    note: "红云组和经验制造相关，多个成员有暖机或额外提升。",
    priority: "高",
  },
  {
    title: "温蒂森蚺异客发电",
    category: "support",
    room: "发电站",
    efficiency: "40%~75%",
    operators: ["温蒂", "森蚺", "异客", "掠风", "承曦格雷伊"],
    note: "发电收益会影响无人机和部分制造组合，常作为赤金线的底座。",
    priority: "高",
  },
  {
    title: "搓玉制造线",
    category: "orundum",
    room: "制造站 原石碎片",
    efficiency: "25%~45%",
    operators: ["褐果", "地灵", "炎熔", "艾雅法拉", "锡兰", "薄绿"],
    note: "搓玉干员多为单体效率，适合按缺口补齐。",
    priority: "中",
  },
  {
    title: "会客线索高效组",
    category: "clue",
    room: "会客室",
    efficiency: "46%~63% / 91%组合",
    operators: ["见行者", "跃跃", "信仰搅拌机", "伊内丝", "提丰", "凛视", "赤刃明霄陈"],
    note: "会客室效率=技能+星级+精英化+进驻加成；提丰 + 凛视标注 91%。",
    priority: "中",
  },
];

const ROTATION_LABELS: Record<NonNullable<NonNullable<PlanComputeParams["options"]>["rotation"]>, string> = {
  abc_12_6_6: "三班倒 12/6/6",
  main_backup_12_12: "主备班 12/12",
  fiammetta_8_8_4_4: "菲亚梅塔 8/8/4/4",
  abyssal_7_5_7_5: "深海组 7/5/7/5",
};

const DEFAULT_PLAN_OPTIONS: Required<NonNullable<PlanComputeParams["options"]>> = {
  rotation: "abc_12_6_6",
  top: 20,
  system_preferences: {},
  maa_title: null,
};

function countRooms(layout: BaseBlueprint | null | undefined) {
  const rooms = layout?.rooms ?? [];
  return {
    total: rooms.length,
    trade: rooms.filter((room) => room.kind === "trade_post").length,
    factory: rooms.filter((room) => room.kind === "factory").length,
    power: rooms.filter((room) => room.kind === "power_plant").length,
    meeting: rooms.filter((room) => room.kind === "meeting_room").length,
    office: rooms.filter((room) => room.kind === "office").length,
    dorm: rooms.filter((room) => room.kind === "dormitory").length,
  };
}

function contractIssues(layout: BaseBlueprint | null | undefined, operbox: OperBoxEntry[] | null | undefined) {
  const issues: string[] = [];
  if (!layout?.rooms?.length) issues.push("缺少 layout.rooms");
  if (!operbox?.length) issues.push("缺少 operbox");
  if ((operbox?.length ?? 0) > 1000) issues.push("operbox 超过 1000 名干员");
  if ((layout?.rooms?.length ?? 0) > 64) issues.push("layout.rooms 超过 64 间房");
  return issues;
}

function operatorReady(entry: OperBoxEntry | undefined) {
  if (!entry?.own) return "missing";
  if (entry.elite >= 2) return "ready";
  return "owned";
}

function operatorCardClass(state: ReturnType<typeof operatorReady>) {
  if (state === "ready") return "border-[#9BEC3A]";
  if (state === "owned") return "border-[#29BDF5]";
  return "border-[#666] opacity-55 grayscale";
}

function priorityClass(priority: ComboAdvice["priority"]) {
  if (priority === "核心") return "border-[#FFD501] bg-[#FFD501] text-black";
  if (priority === "高") return "border-[#29BDF5] bg-[#29BDF5] text-black";
  return "border-white/25 bg-[#3C3C3C]/70 text-white";
}

function OperatorPortraitCard({ name, state }: { name: string; state: ReturnType<typeof operatorReady> }) {
  const portrait = operatorPortraitFor(name);

  return (
    <div className="flex w-[86px] shrink-0 flex-col items-center gap-1.5 max-sm:w-[68px]">
      <div
        className={[
          "relative aspect-square w-[78px] overflow-hidden border-2 bg-[#3C3C3C] shadow-[inset_0_0_18px_rgba(255,255,255,0.16)] max-sm:w-[60px]",
          operatorCardClass(state),
        ].join(" ")}
        title={name}
      >
        {portrait ? (
          <img src={portrait} alt={name} className="absolute inset-0 h-full w-full object-cover outline outline-1 -outline-offset-1 outline-black/20" />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-xs font-semibold text-white">{name}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-transparent to-black/55" />
      </div>
      <span className="w-full truncate text-center text-[12px] font-semibold leading-tight text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.85)] max-sm:text-[10px]" title={name}>
        {name}
      </span>
    </div>
  );
}

function LevelDiamonds({ color }: { color: string }) {
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <span key={index} className="h-5 w-3 skew-x-[-18deg]" style={{ backgroundColor: color }} />
      ))}
    </span>
  );
}

export function TrainingAdvice({ operbox, layout }: { operbox?: OperBoxEntry[] | null; layout?: BaseBlueprint | null }) {
  const ownedByName = new Map((operbox ?? []).map((entry) => [entry.name, entry]));
  const hasBox = Boolean(operbox?.length);
  const ownedTotal = operbox?.filter((entry) => entry.own).length ?? 0;
  const eliteTotal = operbox?.filter((entry) => entry.own && entry.elite >= 2).length ?? 0;
  const roomCounts = countRooms(layout);
  const issues = contractIssues(layout, operbox);
  const planComputePreview: PlanComputeParams = {
    schema_version: 1,
    layout: layout ?? { template: "", drone_cap: 135, scenario: {}, rooms: [] },
    operbox: operbox ?? [],
    labels: {
      layout: layout?.template ?? null,
      operbox: hasBox ? "Current Box" : null,
    },
    options: DEFAULT_PLAN_OPTIONS,
  };

  return (
    <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-5">
      <section className="min-w-0" aria-label="练卡建议概览">
        <div className="mb-2 flex min-w-0 items-center gap-2.5 text-left">
          <span className="h-7 w-1.5 shrink-0 bg-[#FFD501]" aria-hidden="true" />
          <h1 className="truncate text-[21px] font-medium leading-none text-[#313131]">练卡建议</h1>
          <span className="text-xs text-[#313131]/52">{RECOMMENDED_COMBOS.length}</span>
        </div>
        <div className="relative overflow-hidden bg-[#313131] text-white shadow-[0_10px_20px_rgba(0,0,0,0.24)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_35%,rgba(255,255,255,0.12),transparent_22%),linear-gradient(90deg,rgba(49,49,49,0.9),rgba(49,49,49,0.62),rgba(49,49,49,0.95))]" />
          <div className="relative grid gap-3 p-4 lg:grid-cols-[1.1fr_1.4fr]">
            <div className="border-l-4 border-[#FFD501] pl-4">
              <h2 className="text-[23px] font-medium leading-none tracking-normal text-white [text-shadow:0_2px_3px_rgba(0,0,0,0.75)]">基建推荐干员组合</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/72">按高收益组合整理，优先看核心乘区、赤金联动和会客线索；导入 Box 后会标出精二、待练和未拥有。</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              <div className="border border-white/10 bg-black/24 px-3 py-2"><span className="text-xs text-white/48">schema</span><strong className="block text-lg text-white">v{planComputePreview.schema_version}</strong></div>
              <div className="border border-white/10 bg-black/24 px-3 py-2"><span className="text-xs text-white/48">布局</span><strong className="block text-lg text-white">{layout?.template ?? "-"}</strong></div>
              <div className="border border-white/10 bg-black/24 px-3 py-2"><span className="text-xs text-white/48">已有</span><strong className="block text-lg text-white">{hasBox ? ownedTotal : "-"}</strong></div>
              <div className="border border-white/10 bg-black/24 px-3 py-2"><span className="text-xs text-white/48">精二</span><strong className="block text-lg text-white">{hasBox ? eliteTotal : "-"}</strong></div>
              <div className="border border-white/10 bg-black/24 px-3 py-2 sm:col-span-2"><span className="text-xs text-white/48">rotation</span><strong className="block text-base text-white">{ROTATION_LABELS[planComputePreview.options?.rotation ?? "abc_12_6_6"]}</strong></div>
              <div className="border border-white/10 bg-black/24 px-3 py-2 sm:col-span-2"><span className="text-xs text-white/48">设施构成</span><strong className="block text-base text-white">{roomCounts.trade} 贸 / {roomCounts.factory} 制 / {roomCounts.power} 电 / {roomCounts.dorm} 宿</strong></div>
              <div className={["border px-3 py-2 sm:col-span-4", issues.length ? "border-[#FFD501]/55 bg-[#FFD501]/12 text-yellow-100" : "border-[#9BEC3A]/45 bg-[#9BEC3A]/10 text-lime-100"].join(" ")}><span className="text-xs opacity-80">契约检查</span><strong className="block text-sm">{issues.length ? issues.join("、") : "当前 layout 与 operbox 满足 v1 基础字段"}</strong></div>
            </div>
          </div>
        </div>
      </section>

      <section className="min-w-0" aria-label="推荐组合">
        <div className="mb-2 flex min-w-0 items-center gap-2.5 text-left">
          <span className="h-7 w-1.5 shrink-0 bg-[#29BDF5]" aria-hidden="true" />
          <h2 className="truncate text-[21px] font-medium leading-none text-[#313131]">推荐组合</h2>
          <span className="text-xs text-[#313131]/52">{RECOMMENDED_COMBOS.length}</span>
        </div>
        <div className="grid min-w-0 gap-3 pb-2">
          {RECOMMENDED_COMBOS.map((combo) => {
            const meta = CATEGORY_META[combo.category];
            const readyCount = combo.operators.filter((name) => operatorReady(ownedByName.get(name)) === "ready").length;
            const ownedCount = combo.operators.filter((name) => {
              const state = operatorReady(ownedByName.get(name));
              return state === "ready" || state === "owned";
            }).length;
            return (
              <article key={combo.title} className="relative flex min-h-[144px] w-full overflow-hidden bg-[#313131] text-white shadow-[0_10px_20px_rgba(0,0,0,0.24)] max-sm:flex-col">
                <div className="relative w-[360px] shrink-0 overflow-hidden bg-[#313131] max-sm:min-h-[150px] max-sm:w-full">
                  <div className="absolute inset-0 bg-left bg-no-repeat opacity-[0.52]" style={{ backgroundImage: "url(" + meta.bg + ")", backgroundPosition: "-18px center", backgroundSize: "auto 176px" }} aria-hidden="true" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#313131]/20 via-[#313131]/72 to-[#313131]" />
                  <div className="relative z-10 flex h-full flex-col justify-center px-3 py-3">
                    <div className="flex items-start gap-2.5">
                      <div className="min-w-0 truncate text-[23px] font-medium leading-none tracking-normal text-white [text-shadow:0_2px_3px_rgba(0,0,0,0.75)]">{combo.title}</div>
                      <LevelDiamonds color={meta.level} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={["border px-2.5 py-1 text-xs font-semibold", priorityClass(combo.priority)].join(" ")}>{combo.priority}</span>
                      <span className="border border-white/20 bg-[#3C3C3C]/70 px-2.5 py-1 text-xs font-semibold text-white">{meta.label}</span>
                    </div>
                    <div className="mt-3 text-sm leading-5 text-white/76"><span className={meta.text}>{combo.efficiency}</span> <span className="text-white/60">展示效率</span></div>
                    {hasBox ? <div className="mt-1 text-sm leading-5 text-white/62">{readyCount} 精二 / {ownedCount} 已有 / {combo.operators.length} 总计</div> : <div className="mt-1 text-sm leading-5 text-white/62">导入 Box 后显示练度</div>}
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-5 py-3 pl-10 pr-8 max-sm:px-3 max-sm:pt-0">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-x-5 gap-y-3 max-sm:flex-nowrap max-sm:justify-start max-sm:overflow-x-auto max-sm:pb-2">
                    {combo.operators.map((name) => {
                      const state = operatorReady(ownedByName.get(name));
                      return <OperatorPortraitCard key={name} name={name} state={hasBox ? state : "ready"} />;
                    })}
                  </div>
                  <div className="hidden w-[250px] shrink-0 text-sm leading-6 text-white/68 xl:block">{combo.note}</div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 bg-[#313131] p-4 text-sm text-white/72 shadow-[0_10px_20px_rgba(0,0,0,0.18)] md:grid-cols-3">
        <div className="flex gap-3"><CircleDollarSign className="mt-0.5 size-5 text-[#FFD501]" /><p>贸易优先看巫恋、龙舌兰、但书、可露希尔和裁缝 beta 线，收益最集中。</p></div>
        <div className="flex gap-3"><Zap className="mt-0.5 size-5 text-[#9BEC3A]" /><p>制造和发电联动明显，清流、温蒂、森蚺、承曦格雷伊会影响赤金与无人机节奏。</p></div>
        <div className="flex gap-3"><ArrowUpRight className="mt-0.5 size-5 text-[#29BDF5]" /><p>这里先做组合推荐版；下一步可以按当前 Box 自动筛出“最少补几张卡”。</p></div>
      </section>
    </div>
  );
}
