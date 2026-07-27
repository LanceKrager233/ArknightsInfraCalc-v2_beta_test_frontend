import { ArrowUpRight, CircleAlert, ClipboardCheck } from "lucide-react";

import { operatorPortraitFor } from "@/operatorPortraits";
import type { BaseBlueprint, OperBoxEntry, UserProfile, UserProfileAction } from "@/types";

type TrainingAdviceProps = {
  operbox?: OperBoxEntry[] | null;
  layout?: BaseBlueprint | null;
  profile?: UserProfile | null;
};

function countRooms(layout: BaseBlueprint | null | undefined) {
  const rooms = layout?.rooms ?? [];
  return {
    total: rooms.length,
    trade: rooms.filter((room) => room.kind === "trade_post").length,
    factory: rooms.filter((room) => room.kind === "factory").length,
    power: rooms.filter((room) => room.kind === "power_plant").length,
    dormitory: rooms.filter((room) => room.kind === "dormitory").length,
  };
}

function duplicateValues(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    if (seen.has(normalized)) duplicates.add(normalized);
    seen.add(normalized);
  }
  return [...duplicates];
}

function contractIssues(layout: BaseBlueprint | null | undefined, operbox: OperBoxEntry[] | null | undefined) {
  const issues: string[] = [];
  const rooms = layout?.rooms ?? [];
  const entries = operbox ?? [];

  if (!rooms.length) issues.push("缺少 layout.rooms");
  if (!entries.length) issues.push("缺少 operbox");
  if (rooms.length > 64) issues.push("layout.rooms 超过 64 间房");
  if (entries.length > 1000) issues.push("operbox 超过 1000 名干员");
  if (rooms.some((room) => !room.id.trim())) issues.push("存在空房间 ID");
  if (entries.some((entry) => !entry.id.trim() || !entry.name.trim())) issues.push("存在空干员 ID 或名称");

  const duplicateRoomIds = duplicateValues(rooms.map((room) => room.id));
  if (duplicateRoomIds.length) issues.push(`房间 ID 重复：${duplicateRoomIds.join("、")}`);

  const duplicateOperatorIds = duplicateValues(entries.map((entry) => entry.id));
  if (duplicateOperatorIds.length) issues.push(`干员 ID 重复：${duplicateOperatorIds.join("、")}`);

  const duplicateOperatorNames = duplicateValues(entries.map((entry) => entry.name));
  if (duplicateOperatorNames.length) issues.push(`干员名称重复：${duplicateOperatorNames.join("、")}`);

  return issues;
}

function actionKey(action: UserProfileAction, index: number) {
  return `${action.domain_id}-${action.kind}-${action.operator}-${index}`;
}

function ActionCard({
  action,
  entry,
}: {
  action: UserProfileAction;
  entry?: OperBoxEntry;
}) {
  const portrait = operatorPortraitFor(action.operator);
  const state = !entry?.own ? "未拥有" : entry.elite >= 2 ? "已精二" : "待培养";

  return (
    <article className="grid min-w-0 gap-4 bg-[#313131] p-4 text-white shadow-[0_10px_20px_rgba(0,0,0,0.18)] sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:items-center">
      <div className="relative size-[88px] overflow-hidden bg-[#3C3C3C]">
        {portrait ? (
          <img src={portrait} alt={action.operator} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center px-2 text-center text-xs font-semibold">{action.operator || "未知干员"}</div>
        )}
        <div className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-1.5 py-1 text-center text-[11px] font-semibold">
          {action.operator || "未指定干员"}
        </div>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/55">
          <span>{action.domain_id || "general"}</span>
          <span aria-hidden="true">/</span>
          <span>{action.kind || "advice"}</span>
        </div>
        <p className="mt-2 text-sm leading-6 text-white/82">{action.message}</p>
      </div>
      <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
        <span className="border border-[#29BDF5]/50 bg-[#29BDF5]/12 px-2.5 py-1 text-xs font-semibold text-sky-100">
          {action.priority || "未分级"}
        </span>
        <span className="border border-white/15 bg-white/7 px-2.5 py-1 text-xs text-white/70">{state}</span>
      </div>
    </article>
  );
}

export function TrainingAdvice({ operbox, layout, profile }: TrainingAdviceProps) {
  const entries = operbox ?? [];
  const ownedByName = new Map(entries.map((entry) => [entry.name, entry]));
  const roomCounts = countRooms(layout);
  const issues = contractIssues(layout, operbox);
  const actions = profile?.actions ?? [];
  const ownedTotal = entries.filter((entry) => entry.own).length;
  const eliteTotal = entries.filter((entry) => entry.own && entry.elite >= 2).length;

  return (
    <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-5">
      <section className="min-w-0" aria-label="训练建议概览">
        <div className="mb-2 flex min-w-0 items-center gap-2.5">
          <span className="h-7 w-1.5 shrink-0 bg-[#FFD501]" aria-hidden="true" />
          <h1 className="truncate text-[21px] font-medium leading-none text-[#313131]">训练建议</h1>
          <span className="text-xs text-[#313131]/52">{actions.length}</span>
        </div>
        <div className="grid gap-4 bg-[#313131] p-4 text-white shadow-[0_10px_20px_rgba(0,0,0,0.24)] lg:grid-cols-[1.2fr_1fr]">
          <div className="border-l-4 border-[#FFD501] pl-4">
            <h2 className="text-[23px] font-medium leading-none">由 infra-cli 生成的培养动作</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70">
              本页只展示最近一次排班结果中的结构化建议，不在前端维护干员组合、技能公式或效率估算。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="border border-white/10 bg-black/24 px-3 py-2"><span className="text-xs text-white/48">布局</span><strong className="block truncate text-base">{layout?.template || "-"}</strong></div>
            <div className="border border-white/10 bg-black/24 px-3 py-2"><span className="text-xs text-white/48">房间</span><strong className="block text-base">{roomCounts.total || "-"}</strong></div>
            <div className="border border-white/10 bg-black/24 px-3 py-2"><span className="text-xs text-white/48">已拥有</span><strong className="block text-base">{entries.length ? ownedTotal : "-"}</strong></div>
            <div className="border border-white/10 bg-black/24 px-3 py-2"><span className="text-xs text-white/48">已精二</span><strong className="block text-base">{entries.length ? eliteTotal : "-"}</strong></div>
            <div className="col-span-2 border border-white/10 bg-black/24 px-3 py-2 text-xs text-white/65 sm:col-span-4">
              设施：{roomCounts.trade} 贸易 / {roomCounts.factory} 制造 / {roomCounts.power} 发电 / {roomCounts.dormitory} 宿舍
            </div>
          </div>
        </div>
      </section>

      {issues.length ? (
        <section className="flex gap-3 border border-[#FFD501]/45 bg-[#FFF7D6] p-4 text-sm text-[#5C4900]" aria-label="输入契约问题">
          <CircleAlert className="mt-0.5 size-5 shrink-0" />
          <div>
            <strong>输入尚未满足 plan.compute v1 基础约束</strong>
            <ul className="mt-2 grid gap-1">
              {issues.map((issue) => <li key={issue}>• {issue}</li>)}
            </ul>
          </div>
        </section>
      ) : (
        <section className="flex gap-3 border border-[#5B8F00]/25 bg-[#F2F8E8] p-4 text-sm text-[#385B00]" aria-label="输入契约检查">
          <ClipboardCheck className="mt-0.5 size-5 shrink-0" />
          <p>当前 layout 与 operbox 通过前端基础检查；最终契约校验仍以 infra-cli 响应为准。</p>
        </section>
      )}

      <section className="min-w-0" aria-label="CLI 培养动作">
        <div className="mb-2 flex min-w-0 items-center gap-2.5">
          <span className="h-7 w-1.5 shrink-0 bg-[#29BDF5]" aria-hidden="true" />
          <h2 className="truncate text-[21px] font-medium leading-none text-[#313131]">CLI 建议</h2>
          <span className="text-xs text-[#313131]/52">{actions.length}</span>
        </div>
        {actions.length ? (
          <div className="grid min-w-0 gap-3">
            {actions.map((action, index) => (
              <ActionCard key={actionKey(action, index)} action={action} entry={ownedByName.get(action.operator)} />
            ))}
          </div>
        ) : (
          <div className="grid min-h-[220px] place-items-center bg-[#313131] p-6 text-center text-white shadow-[0_10px_20px_rgba(0,0,0,0.18)]">
            <div className="max-w-xl">
              <ArrowUpRight className="mx-auto size-8 text-[#29BDF5]" />
              <h3 className="mt-3 text-lg font-semibold">尚无可展示的 CLI 建议</h3>
              <p className="mt-2 text-sm leading-6 text-white/62">先配置 Box 与布局并生成一次排班；只有返回的 profile.actions 会出现在这里。</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
