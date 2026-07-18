"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Database, FileJson, Settings2, ShieldCheck, Terminal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import {
  calculateRoomEfficiency,
  getHealth,
  getSampleOperbox,
  getSklandSession,
  logoutSkland,
  runPlan,
  saveFeedback,
  selectSklandRole,
  syncSkland,
} from "./api";
import {
  buildBlueprint,
  computePowerBudget,
  FACTORY_RECIPE_OPTIONS,
  FactoryRecipe,
  PRESETS,
  TRADE_ORDER_OPTIONS,
  TradeOrder,
  updateFactoryRecipe,
  updateRoomLevel,
  updateTradeOrder,
} from "./blueprint";
import {
  DebugActions,
  IssuePanel,
  IssueNoteModal,
  Panel,
  PlanTelemetry,
  RunButton,
  ScheduleBoard,
  ShiftTabs,
  StatusBar,
} from "./components";
import { copyText, downloadJson } from "./download";
import { ONBOARDING_STORAGE_KEY, initialSetupStep, shouldAutoOpenSetup, type SetupStep } from "./onboarding";
import { readOperboxFile, readOperboxText } from "./operbox";
import { planToRows, RoomRow } from "./schedule";
import { SetupDialog } from "./setup-dialog";
import { closestShift, compareShifts } from "./skland";
import { InfrastructureSnapshot, ShiftComparisonCard, SklandAccount } from "./skland-components";
import {
  BaseBlueprint,
  BoxSource,
  BlueprintRoom,
  FeedbackApiResponse,
  IssueReport,
  OperBoxEntry,
  PlanApiResponse,
  PresetDef,
  SklandSnapshot,
} from "./types";

const SESSION_KEY = "arknights-infra-calc-beta-session-v3";
const LEGACY_SESSION_KEY = "arknights-infra-calc-beta-session-v2";
const RESULT_CLEAR_WARNING_DISMISSED_KEY = "arknights-infra-calc-result-clear-warning-dismissed";
const KNOWN_ISSUES = [
  "Beta 娴嬭瘯闃舵浠嶅彲鑳藉嚭鐜版帓鐝瓥鐣ュ拰棰勬湡涓嶄竴鑷寸殑鎯呭喌锛涜鐢ㄢ€滄爣璁伴棶棰樷€濇彁浜や笂涓嬫枃銆?,
  "濡傞亣鍒?CLI 杩愯澶辫触锛岃鍏堜笅杞借皟璇曞寘骞朵繚鐣欐湰娆¤繍琛岃褰曘€?,
];

type ProductChange =
  | { type: "factory"; roomId: string; recipe: FactoryRecipe }
  | { type: "trade"; roomId: string; order: TradeOrder };

function safeParseJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function readSessionState() {
  if (typeof window === "undefined") return null;
  return safeParseJson(window.localStorage.getItem(SESSION_KEY)) ?? safeParseJson(window.localStorage.getItem(LEGACY_SESSION_KEY));
}

function readResultClearWarningDismissed() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(RESULT_CLEAR_WARNING_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function resolvePreset(value: PresetDef | undefined): PresetDef {
  return PRESETS.find((preset) => preset.label === value?.label) ?? PRESETS[0];
}

function parseLayoutJson(value: unknown): BaseBlueprint | null {
  if (!value || typeof value !== "object") return null;
  const layout = value as Partial<BaseBlueprint>;
  if (typeof layout.template !== "string" || !Array.isArray(layout.rooms) || !layout.scenario || typeof layout.scenario !== "object") {
    return null;
  }
  const rooms = layout.rooms.map((room) => {
    if (!room || typeof room !== "object" || typeof room.id !== "string" || typeof room.kind !== "string") return null;
    const level = Number((room as BlueprintRoom).level);
    const maxLevel = (room as BlueprintRoom).kind === "control_center" || (room as BlueprintRoom).kind === "dormitory" ? 5 : 3;
    if (!Number.isInteger(level) || level < 1 || level > maxLevel) return null;
    return { ...room, level } as BlueprintRoom;
  });
  if (rooms.some((room) => room === null) || !rooms.some((room) => room?.kind === "control_center")) return null;
  return { ...layout, drone_cap: Number(layout.drone_cap ?? 0), scenario: layout.scenario, rooms: rooms as BlueprintRoom[] } as BaseBlueprint;
}

function layoutValidationError(layout: BaseBlueprint): string | null {
  if (!layout.rooms.some((room) => room.kind === "control_center")) return "甯冨眬蹇呴』鍖呭惈鎺у埗涓灑銆?;
  const invalid = layout.rooms.find((room) => {
    const maxLevel = room.kind === "control_center" || room.kind === "dormitory" ? 5 : 3;
    return !Number.isInteger(room.level) || room.level < 1 || room.level > maxLevel;
  });
  if (!invalid) return null;
  const maxLevel = invalid.kind === "control_center" || invalid.kind === "dormitory" ? 5 : 3;
  return `${invalid.id} 鐨勮鏂界瓑绾у繀椤诲湪 1鈥?{maxLevel} 涔嬮棿銆俙;
}

function restoreEditableProducts(baseLayout: BaseBlueprint, cachedLayout: BaseBlueprint | undefined): BaseBlueprint {
  if (!cachedLayout) return baseLayout;

  const cachedRooms = new Map(cachedLayout.rooms.map((room) => [room.id, room]));
  return {
    ...baseLayout,
    rooms: baseLayout.rooms.map((room) => {
      const cachedRoom = cachedRooms.get(room.id);
      if (room.kind === "factory" && cachedRoom?.kind === "factory" && cachedRoom.product && "factory" in cachedRoom.product) {
        return {
          ...room,
          level: Number.isFinite(cachedRoom.level) ? cachedRoom.level : room.level,
          product: { factory: { recipe: cachedRoom.product.factory.recipe } },
        };
      }
      if (
        room.kind === "trade_post" &&
        cachedRoom?.kind === "trade_post" &&
        cachedRoom.product &&
        "trade" in cachedRoom.product
      ) {
        return {
          ...room,
          level: Number.isFinite(cachedRoom.level) ? cachedRoom.level : room.level,
          product: { trade: { order: cachedRoom.product.trade.order } },
        };
      }
      return { ...room, level: typeof cachedRoom?.level === "number" ? cachedRoom.level : room.level };
    }),
  };
}

function mergeSklandLayout(current: BaseBlueprint, suggestion: BaseBlueprint): BaseBlueprint {
  return {
    ...suggestion,
    drone_cap: current.drone_cap,
    scenario: structuredClone(current.scenario),
  };
}

function buildIssueReport(
  issue: { row: RoomRow; note: string } | null,
  sourceName: string | null,
  command?: string
): IssueReport | null {
  if (!issue) return null;
  return {
    type: "room_issue",
    sourceName,
    room: {
      title: issue.row.title,
      group: issue.row.group,
      product: issue.row.product,
      operators: issue.row.operators,
      inferredRule: issue.row.rule,
      efficiency: issue.row.efficiency,
      efficiencyLabel: issue.row.efficiencyLabel,
    },
    command,
    note: issue.note,
  };
}

function WorkbenchApp() {
  const initialSession = readSessionState() as
    | {
        preset?: PresetDef;
        layout?: BaseBlueprint;
        operbox?: OperBoxEntry[] | null;
        fileName?: string | null;
        boxSource?: BoxSource;
        layoutDirty?: boolean;
        result?: PlanApiResponse | null;
        activeShift?: number;
        issueOpen?: boolean;
        issueDraftRow?: RoomRow | null;
        issueDraftNote?: string;
        issue?: { row: RoomRow; note: string } | null;
        feedback?: FeedbackApiResponse | null;
      }
    | null;

  const initialPreset = resolvePreset(initialSession?.preset);
  const initialLayout = restoreEditableProducts(buildBlueprint(initialPreset), initialSession?.layout);
  const [preset, setPreset] = useState<PresetDef>(initialPreset);
  const [layout, setLayout] = useState<BaseBlueprint>(initialLayout);
  const powerBudget = useMemo(() => computePowerBudget(layout), [layout]);
  const [operbox, setOperbox] = useState<OperBoxEntry[] | null>(initialSession?.operbox ?? null);
  const [fileName, setFileName] = useState<string | null>(initialSession?.fileName ?? null);
  const [boxSource, setBoxSource] = useState<BoxSource>(initialSession?.boxSource ?? (initialSession?.operbox ? "maa" : "sample"));
  const [layoutDirty, setLayoutDirty] = useState(initialSession?.layoutDirty ?? Boolean(initialSession?.layout));
  const [inputMode, setInputMode] = useState<"skland" | "maa">("skland");
  const [maaPaste, setMaaPaste] = useState("");
  const [sklandSnapshot, setSklandSnapshot] = useState<SklandSnapshot | null>(null);
  const [sklandConfigured, setSklandConfigured] = useState(false);
  const [sklandDisabledReason, setSklandDisabledReason] = useState<string | null>(null);
  const [sklandBusy, setSklandBusy] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupInitialStep, setSetupInitialStep] = useState<SetupStep>("box");
  const [sklandAccountOpen, setSklandAccountOpen] = useState(false);
  const resumeSetupAfterSkland = useRef(false);
  const initialLayoutForRestore = useRef(initialLayout);
  const initialBoxSource = useRef(boxSource);
  const initialOperbox = useRef(operbox);
  const initialLayoutDirty = useRef(layoutDirty);
  const [inputError, setInputError] = useState<string | null>(null);
  const [result, setResult] = useState<PlanApiResponse | null>(initialSession?.result ?? null);
  const [loading, setLoading] = useState(false);
  const [cliPath, setCliPath] = useState<string | null>(null);
  const [cliReady, setCliReady] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [activeShift, setActiveShift] = useState(initialSession?.activeShift ?? 0);
  const [issueDraftRow, setIssueDraftRow] = useState<RoomRow | null>(
    initialSession?.issueDraftRow ?? initialSession?.issue?.row ?? null
  );
  const [issueDraftNote, setIssueDraftNote] = useState(
    initialSession?.issueDraftNote ?? initialSession?.issue?.note ?? ""
  );
  const [savedIssue, setSavedIssue] = useState<{ row: RoomRow; note: string } | null>(
    initialSession?.issue ?? null
  );
  const [issueOpen, setIssueOpen] = useState(initialSession?.issueOpen ?? false);
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState<FeedbackApiResponse | null>(initialSession?.feedback ?? null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [resultClearNotice, setResultClearNotice] = useState<string | null>(null);
  const [resultClearWarningDismissed, setResultClearWarningDismissed] = useState(readResultClearWarningDismissed);
  const [roomEfficiencyNotice, setRoomEfficiencyNotice] = useState<string | null>(null);

  const scheduleResult = result?.success ? result : null;
  const activePlan = scheduleResult?.maaJson?.plans?.[activeShift];
  const activeRotationShift = scheduleResult?.rotationJson?.shifts?.[activeShift];
  const rows = useMemo(() => planToRows(activePlan, activeRotationShift, layout), [activePlan, activeRotationShift, layout]);
  const currentMoraleByOperator = useMemo(() => {
    if (boxSource !== "skland" || !sklandSnapshot) return undefined;

    return new Map(
      sklandSnapshot.infrastructure.rooms.flatMap((room) =>
        room.operators.map((operator) => [operator.name, operator.morale] as const)
      )
    );
  }, [boxSource, sklandSnapshot]);
  const shiftComparisons = useMemo(
    () => compareShifts(scheduleResult?.maaJson, sklandSnapshot?.infrastructure),
    [scheduleResult?.maaJson, sklandSnapshot?.infrastructure]
  );
  const closestComparison = useMemo(() => closestShift(shiftComparisons), [shiftComparisons]);
  const sklandLayoutMatches = useMemo(() => {
    const suggestion = sklandSnapshot?.infrastructure.layoutSuggestion;
    if (!suggestion) return false;
    const compact = (value: BaseBlueprint) => value.rooms.map((room) => [room.id, room.kind, room.level, room.product]);
    return JSON.stringify(compact(layout)) === JSON.stringify(compact(suggestion));
  }, [layout, sklandSnapshot?.infrastructure.layoutSuggestion]);
  const canRun = Boolean(operbox && operbox.length > 0 && cliReady);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const session = {
      preset,
      layout,
      operbox,
      fileName,
      boxSource,
      layoutDirty,
      result: result?.success ? result : null,
      activeShift,
      issueOpen,
      issueDraftRow,
      issueDraftNote,
      issue: savedIssue,
      feedback: feedbackResult,
    };
    try {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      console.warn("Failed to persist workbench session", error);
    }
  }, [preset, layout, operbox, fileName, boxSource, layoutDirty, result, activeShift, issueOpen, issueDraftRow, issueDraftNote, savedIssue, feedbackResult]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (shouldAutoOpenSetup(window.localStorage.getItem(ONBOARDING_STORAGE_KEY), Boolean(initialOperbox.current?.length))) {
      setSetupInitialStep("box");
      setSetupOpen(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled([getHealth(), getSklandSession()]).then(([healthResult, sessionResult]) => {
      if (cancelled) return;
      if (healthResult.status === "fulfilled") {
        const health = healthResult.value;
        setSklandConfigured(Boolean(health.sklandConfigured));
        setSklandDisabledReason(health.sklandDisabledReason ?? null);
        if (health.ok && health.cliReady) {
          setCliPath(health.cliPath ?? null);
          setCliReady(true);
          setApiError(null);
        } else {
          setCliReady(false);
          setCliPath(health.cliPath ?? null);
          setApiError(health.serveError ?? health.error ?? "API 姝ｅ父锛屼絾鏈壘鍒板彲鎵ц鐨?infra-cli銆?);
        }
      } else {
        setCliReady(false);
        setApiError(healthResult.reason instanceof Error ? healthResult.reason.message : "鏈湴 API 鏈嶅姟涓嶅彲鐢ㄣ€?);
      }

      if (sessionResult.status === "fulfilled") {
        const session = sessionResult.value;
        setSklandConfigured(session.configured);
        setSklandDisabledReason(session.disabledReason ?? null);
        if (session.authenticated && session.snapshot) {
          setSklandSnapshot(session.snapshot);
          if (initialBoxSource.current === "skland" || !initialOperbox.current) {
            setOperbox(session.snapshot.operbox);
            setFileName(session.snapshot.sourceName);
            setBoxSource("skland");
          }
          if (!initialLayoutDirty.current && session.snapshot.infrastructure.layoutSuggestion) {
            const suggestion = session.snapshot.infrastructure.layoutSuggestion;
            setLayout(mergeSklandLayout(initialLayoutForRestore.current, suggestion));
            setPreset(resolvePreset(PRESETS.find((item) => item.label === session.snapshot?.infrastructure.layoutLabel)));
          }
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleFile(file: File): Promise<boolean> {
    setInputError(null);
    setResult(null);
    clearIssueState();
    try {
      const entries = await readOperboxFile(file);
      setOperbox(entries);
      setFileName(file.name);
      setBoxSource("maa");
      return true;
    } catch (error) {
      setInputError(error instanceof Error ? error.message : "缁冨害鏂囦欢瑙ｆ瀽澶辫触銆?);
      return false;
    }
  }

  function applySklandSnapshot(snapshot: SklandSnapshot, applyLayoutWhenClean = true) {
    setSklandSnapshot(snapshot);
    setOperbox(snapshot.operbox);
    setFileName(snapshot.sourceName);
    setBoxSource("skland");
    setInputMode("skland");
    clearPlanResult();
    if (applyLayoutWhenClean && !layoutDirty && snapshot.infrastructure.layoutSuggestion) {
      setLayout((current) => mergeSklandLayout(current, snapshot.infrastructure.layoutSuggestion as BaseBlueprint));
      setPreset(resolvePreset(PRESETS.find((item) => item.label === snapshot.infrastructure.layoutLabel)));
      setLayoutDirty(false);
    }
  }

  function handleMaaPaste(): boolean {
    setInputError(null);
    try {
      const entries = readOperboxText(maaPaste);
      setOperbox(entries);
      setFileName("绮樿创鐨?Arknights_OperBox_Export.json");
      setBoxSource("maa");
      clearPlanResult();
      return true;
    } catch (error) {
      setInputError(error instanceof Error ? error.message : "MAA JSON 瑙ｆ瀽澶辫触銆?);
      return false;
    }
  }

  async function handleSklandRefresh() {
    setSklandBusy(true);
    setInputError(null);
    try {
      const session = await syncSkland();
      if (!session.authenticated || !session.snapshot) throw new Error(session.error ?? "妫┖宀涘悓姝ュけ璐ャ€?);
      applySklandSnapshot(session.snapshot, false);
    } catch (error) {
      setInputError(error instanceof Error ? error.message : "妫┖宀涘悓姝ュけ璐ャ€?);
    } finally {
      setSklandBusy(false);
    }
  }

  async function handleSklandRole(uid: string) {
    setSklandBusy(true);
    setInputError(null);
    try {
      const session = await selectSklandRole(uid);
      if (!session.authenticated || !session.snapshot) throw new Error(session.error ?? "瑙掕壊鍒囨崲澶辫触銆?);
      applySklandSnapshot(session.snapshot, false);
    } catch (error) {
      setInputError(error instanceof Error ? error.message : "瑙掕壊鍒囨崲澶辫触銆?);
    } finally {
      setSklandBusy(false);
    }
  }

  async function handleSklandLogout() {
    setSklandBusy(true);
    setInputError(null);
    try {
      await logoutSkland();
      setSklandSnapshot(null);
      if (boxSource === "skland") {
        setOperbox(null);
        setFileName(null);
        setBoxSource("sample");
        clearPlanResult();
      }
    } catch (error) {
      setInputError(error instanceof Error ? error.message : "閫€鍑烘．绌哄矝澶辫触銆?);
    } finally {
      setSklandBusy(false);
    }
  }

  function handleApplySklandLayout() {
    const suggestion = sklandSnapshot?.infrastructure.layoutSuggestion;
    if (!suggestion) return;
    setLayout((current) => mergeSklandLayout(current, suggestion));
    setPreset(resolvePreset(PRESETS.find((item) => item.label === sklandSnapshot.infrastructure.layoutLabel)));
    setLayoutDirty(false);
    clearPlanResult();
  }

  async function handleRun() {
    if (!operbox) return;
    const layoutError = layoutValidationError(layout);
    if (layoutError) {
      setApiError(layoutError);
      return;
    }
    if (!cliReady) {
      setApiError("褰撳墠娌℃湁鍙繍琛岀殑 infra-cli锛沇indows 鏈湴璇疯缃?INFRA_CLI_PATH 鎸囧悜 infra-cli.exe銆?);
      return;
    }
    setLoading(true);
    setResultClearNotice(null);
    setInputError(null);
    setApiError(null);
    setResult(null);
    setActiveShift(0);
    clearIssueState();

    try {
      const response = await runPlan({
        layout,
        operbox,
        sourceName: fileName,
      });
      setResult(response);
      if (!response.success) {
        setApiError(response.error ?? "infra-cli 娌℃湁鎴愬姛鐢熸垚鎺掔彮銆?);
      }
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "鎺掔彮璇锋眰澶辫触銆?);
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadSample(): Promise<boolean> {
    setInputError(null);
    setResult(null);
    clearIssueState();
    try {
      const sample = await getSampleOperbox();
      if (!sample.success || !sample.operbox) {
        throw new Error(sample.error ?? "鏍蜂緥鏁版嵁璇诲彇澶辫触銆?);
      }
      setOperbox(sample.operbox);
      setFileName(sample.sourceName ?? "243 鍏ㄧ簿浜屾牱渚?);
      setBoxSource("sample");
      return true;
    } catch (error) {
      setInputError(error instanceof Error ? error.message : "鏍蜂緥鏁版嵁璇诲彇澶辫触銆?);
      return false;
    }
  }

  function handleDownloadMaa() {
    if (result?.maaJson) downloadJson("infra-calc-beta-maa.json", result.maaJson);
  }

  function handleDownloadBundle() {
    if (result?.debugBundle) downloadJson("infra-calc-beta-debug-bundle.json", result.debugBundle);
  }

  function handleCopyCommand() {
    if (result?.command) void copyText(result.command);
  }

  function clearIssueState() {
    setIssueDraftRow(null);
    setIssueDraftNote("");
    setSavedIssue(null);
    setIssueOpen(false);
    setFeedbackResult(null);
    setFeedbackError(null);
  }

  function handleMarkIssue(row: RoomRow) {
    setIssueDraftRow(row);
    setIssueDraftNote("");
    setSavedIssue(null);
    setFeedbackResult(null);
    setFeedbackError(null);
    setIssueOpen(true);
  }

  async function handleCalculateRoomEfficiency(row: RoomRow) {
    setRoomEfficiencyNotice(null);
    const response = await calculateRoomEfficiency({
      roomId: row.roomId,
      roomTitle: row.title,
      operators: row.operators,
      product: row.product,
    });
    setRoomEfficiencyNotice(response.success ? `${row.title} 效率已更新。` : response.error ?? "当前房间效率计算失败。");
  }

  async function handleSaveIssue() {
    if (!issueDraftRow || !issueDraftNote.trim()) return;
    if (!operbox || operbox.length === 0) {
      setFeedbackError("璇峰厛涓婁紶鎴栬浇鍏?operbox銆?);
      return;
    }

    const issue = { row: issueDraftRow, note: issueDraftNote.trim() };
    const report = buildIssueReport(issue, fileName, result?.debugBundle?.command);
    if (!report) return;

    setFeedbackSaving(true);
    setFeedbackError(null);
    setApiError(null);
    try {
      const response = await saveFeedback({
        issue: report,
        operbox,
        sourceName: fileName,
        debugBundle: result?.debugBundle,
      });
      if (!response.success) {
        throw new Error(response.error ?? "鍙嶉淇濆瓨澶辫触銆?);
      }
      setSavedIssue(issue);
      setFeedbackResult(response);
      setIssueOpen(false);
      setIssueDraftRow(null);
      setIssueDraftNote("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "鍙嶉淇濆瓨澶辫触銆?;
      setFeedbackError(message);
      setApiError(message);
    } finally {
      setFeedbackSaving(false);
    }
  }

  function handleCancelIssue() {
    setIssueOpen(false);
    setIssueDraftRow(null);
    setIssueDraftNote("");
  }

  function clearPlanResult() {
    setResult(null);
    setActiveShift(0);
    clearIssueState();
  }

  function applyProductChange(change: ProductChange) {
    if (change.type === "factory") {
      setLayout((current) => updateFactoryRecipe(current, change.roomId, change.recipe));
    } else {
      setLayout((current) => updateTradeOrder(current, change.roomId, change.order));
    }
    setLayoutDirty(true);
    clearPlanResult();
  }

  function productChangeLabel(change: ProductChange) {
    if (change.type === "factory") {
      return FACTORY_RECIPE_OPTIONS.find((option) => option.recipe === change.recipe)?.label;
    }
    return TRADE_ORDER_OPTIONS.find((option) => option.order === change.order)?.label;
  }

  function showResultClearNotice(label: string | undefined) {
    if (resultClearWarningDismissed || !result?.success) return;
    setResultClearNotice(label ? `宸插垏鎹㈠埌锛?{label}` : "閰嶇疆宸插垏鎹?);
  }

  function requestProductChange(change: ProductChange) {
    showResultClearNotice(productChangeLabel(change));
    applyProductChange(change);
  }

  function dismissResultClearWarning() {
    setResultClearWarningDismissed(true);
    setResultClearNotice(null);
    try {
      window.localStorage.setItem(RESULT_CLEAR_WARNING_DISMISSED_KEY, "1");
    } catch {
      // The current session can still honor the preference when storage is unavailable.
    }
  }

  function restoreResultClearWarning() {
    setResultClearWarningDismissed(false);
    try {
      window.localStorage.removeItem(RESULT_CLEAR_WARNING_DISMISSED_KEY);
    } catch {
      // The in-memory preference has already been restored.
    }
  }

  function handlePresetSelect(nextPreset: PresetDef) {
    showResultClearNotice(`甯冨眬 ${nextPreset.label}`);
    setPreset(nextPreset);
    setLayout(buildBlueprint(nextPreset));
    setLayoutDirty(true);
    clearPlanResult();
  }

  function handleFactoryRecipeChange(roomId: string, recipe: FactoryRecipe) {
    requestProductChange({ type: "factory", roomId, recipe });
  }

  function handleTradeOrderChange(roomId: string, order: TradeOrder) {
    requestProductChange({ type: "trade", roomId, order });
  }

  function handleRoomLevelChange(roomId: string, level: number) {
    setLayout((current) => updateRoomLevel(current, roomId, level));
    setLayoutDirty(true);
    clearPlanResult();
  }

  async function handleLayoutFile(file: File) {
    try {
      const parsed = parseLayoutJson(JSON.parse(await file.text()));
      if (!parsed) throw new Error("layout JSON 鏍煎紡鏃犳晥锛氶渶瑕?rooms[].id銆乲ind 鍜屽悎娉曠殑璁炬柦绛夌骇銆?);
      setLayout(parsed);
      setLayoutDirty(true);
      clearPlanResult();
      setInputError(null);
    } catch (error) {
      setInputError(error instanceof Error ? error.message : "甯冨眬 JSON 璇诲彇澶辫触銆?);
    }
  }

  function markOnboardingSeen() {
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
    } catch (error) {
      console.warn("Failed to persist onboarding state", error);
    }
  }

  function openSetup() {
    setSetupInitialStep(initialSetupStep(Boolean(operbox?.length)));
    setSetupOpen(true);
  }

  function handleSetupOpenChange(next: boolean) {
    setSetupOpen(next);
    if (!next) markOnboardingSeen();
  }

  function closeSetup() {
    markOnboardingSeen();
    setSetupOpen(false);
  }

  function openSklandFromSetup() {
    resumeSetupAfterSkland.current = true;
    setSetupOpen(false);
    setSklandAccountOpen(true);
  }

  function handleSklandAccountOpenChange(next: boolean) {
    setSklandAccountOpen(next);
    if (!next && resumeSetupAfterSkland.current) {
      resumeSetupAfterSkland.current = false;
      setSetupInitialStep("box");
      setSetupOpen(true);
    }
  }

  function handleSklandAuthenticated(snapshot: SklandSnapshot) {
    applySklandSnapshot(snapshot);
    if (resumeSetupAfterSkland.current) {
      resumeSetupAfterSkland.current = false;
      setSetupInitialStep("layout");
      setSetupOpen(true);
    }
  }

  function handleUseCurrentSklandBox() {
    if (sklandSnapshot) applySklandSnapshot(sklandSnapshot, false);
  }

  const issueForPanel = useMemo(
    () => savedIssue ?? (issueDraftRow && issueOpen ? { row: issueDraftRow, note: issueDraftNote } : null),
    [issueDraftNote, issueDraftRow, issueOpen, savedIssue]
  );
  const issueReport = useMemo(
    () => buildIssueReport(issueForPanel, fileName, result?.debugBundle?.command),
    [issueForPanel, fileName, result?.debugBundle?.command]
  );

  return (
    <main className="min-h-screen bg-background px-4 py-4 text-foreground sm:px-5">
      <header className="mx-auto mb-4 max-w-[1760px] border-b pb-4">
        <h1 className="sr-only">鏄庢棩鏂硅垷鍩哄缓鎺掔彮楠屾敹宸ヤ綔鍙?/h1>
        <div className="grid w-full grid-cols-[minmax(240px,1fr)_auto_auto_auto] items-center gap-2 max-sm:grid-cols-3">
          <StatusBar loading={loading} result={result} error={inputError ?? apiError} cliPath={cliPath} />
          <Button
            type="button"
            variant="outline"
            className="h-10 min-w-0 px-3 max-sm:w-full"
            aria-label="閰嶇疆 Box 涓庡竷灞€"
            onClick={openSetup}
          >
            <Settings2 />
            <span className="hidden md:inline">閰嶇疆 Box 涓庡竷灞€</span>
            <span className="md:hidden">閰嶇疆</span>
          </Button>
          <SklandAccount
            open={sklandAccountOpen}
            onOpenChange={handleSklandAccountOpenChange}
            configured={sklandConfigured}
            disabledReason={sklandDisabledReason}
            snapshot={sklandSnapshot}
            busy={sklandBusy}
            onAuthenticated={handleSklandAuthenticated}
            onRefresh={handleSklandRefresh}
            onRoleChange={handleSklandRole}
            onLogout={handleSklandLogout}
          />
          <RunButton canRun={canRun} loading={loading} onRun={handleRun} />
        </div>
      </header>

      <section className="mx-auto grid max-w-[1760px] grid-cols-[minmax(0,1fr)_430px] items-start max-[1100px]:block">
        <section className="min-w-0 pr-5 max-[1100px]:pr-0">
          <Panel title="璁″垝瀹夋帓" icon={<ShieldCheck className="size-4" />} className="min-h-[calc(100vh-112px)]">
            <div className="mb-3 flex items-start justify-between gap-3 max-sm:flex-col">
              <div className="min-w-0">
                <strong className="block truncate text-sm font-medium">
                  {result?.maaJson?.title ?? "绛夊緟鐢熸垚鎺掔彮"}
                </strong>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {activePlan?.description ?? "閰嶇疆 Box 涓庡熀寤哄竷灞€鍚庯紝鍗冲彲鐢熸垚涓夌彮鎺掔彮銆?}
                </span>
              </div>
              <ShiftTabs maaJson={result?.maaJson} active={activeShift} closest={closestComparison?.planIndex} onChange={setActiveShift} />
            </div>
            {!operbox ? (
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-y border-dashed border-border/70 py-6">
                <div>
                  <strong className="block text-sm">鍏堝畬鎴?Box 涓庡竷灞€閰嶇疆</strong>
                  <p className="mt-1 text-sm text-muted-foreground">鏀寔妫┖宀涘悓姝ャ€丮AA 瀵煎叆鍜?243 鍏ㄧ簿浜屾牱渚嬨€?/p>
                </div>
                <Button type="button" onClick={openSetup}><Settings2 />閰嶇疆 Box 涓庡竷灞€</Button>
              </div>
            ) : null}
            <PlanTelemetry
              profile={scheduleResult?.profileJson}
              rotation={scheduleResult?.rotationJson}
              layout={layout}
              activeShift={activeShift}
            />
            <ShiftComparisonCard comparison={closestComparison} />
            {roomEfficiencyNotice ? (
              <div className="mb-3 border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {roomEfficiencyNotice}
              </div>
            ) : null}
            <ScheduleBoard
              rows={rows}
              layout={layout}
              currentMoraleByOperator={currentMoraleByOperator}
              onIssue={handleMarkIssue}
              onCalculateRoomEfficiency={handleCalculateRoomEfficiency}
              onFactoryRecipeChange={handleFactoryRecipeChange}
              onTradeOrderChange={handleTradeOrderChange}
            />
          </Panel>
        </section>

        <aside className="min-w-0 divide-y divide-border/70 border-l border-border/70 pl-5 max-[1100px]:mt-5 max-[1100px]:grid max-[1100px]:grid-cols-[repeat(auto-fit,minmax(280px,1fr))] max-[1100px]:divide-x max-[1100px]:divide-y-0 max-[1100px]:border-l-0 max-[1100px]:border-t max-[1100px]:pl-0 max-[1100px]:[&>section]:px-5 max-[700px]:block max-[700px]:divide-x-0 max-[700px]:divide-y max-[700px]:[&>section]:px-0">
          {sklandSnapshot ? (
            <Panel title="褰撳墠鐘舵€?路 妫┖宀涘熀寤? icon={<Database className="size-4" />}>
              <InfrastructureSnapshot snapshot={sklandSnapshot} layoutMatches={sklandLayoutMatches} onApplyLayout={handleApplySklandLayout} />
            </Panel>
          ) : null}
          <Panel title="闂涓婁笅鏂? icon={<FileJson className="size-4" />}>
            <IssuePanel
              issue={issueForPanel}
              report={issueReport}
              feedback={feedbackResult}
              feedbackError={feedbackError}
            />
          </Panel>

          <Panel title="璋冭瘯杈撳嚭" icon={<Terminal className="size-4" />}>
            <DebugActions
              result={result}
              onDownloadMaa={handleDownloadMaa}
              onDownloadBundle={handleDownloadBundle}
              onCopyCommand={handleCopyCommand}
            />
            <details className="mt-3 text-sm text-muted-foreground">
              <summary className="cursor-pointer">stdout / stderr</summary>
              <Textarea
                readOnly
                value={result?.stdout || result?.stderr || "鏆傛棤杈撳嚭銆?}
                className="mt-2 max-h-64 min-h-32 resize-y font-mono text-xs"
              />
            </details>
          </Panel>
        </aside>
      </section>

      {resultClearNotice ? (
        <aside
          className="fixed left-1/2 top-4 z-[70] w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 border border-[#FFD800]/70 bg-[#313131] px-4 py-3 text-white shadow-[0_16px_44px_rgba(0,0,0,0.35)]"
          aria-live="polite"
          aria-label="鎺掔彮缁撴灉宸叉竻绌?
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <strong className="block text-sm font-semibold text-[#FFD800]">宸叉竻绌烘棫姹傝В缁撴灉</strong>
              <span className="mt-0.5 block text-xs text-white/68">{resultClearNotice}锛岄渶瑕侀噸鏂拌繍琛屾眰瑙ｃ€?/span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button type="button" size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setResultClearNotice(null)}>
                鐭ラ亾浜?
              </Button>
              <Button type="button" size="sm" variant="outline" className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={dismissResultClearWarning}>
                涓嶅啀鎻愮ず
              </Button>
            </div>
          </div>
        </aside>
      ) : null}

      <SetupDialog
        open={setupOpen}
        initialStep={setupInitialStep}
        onOpenChange={handleSetupOpenChange}
        operbox={operbox}
        boxSource={boxSource}
        fileName={fileName}
        inputMode={inputMode}
        onInputModeChange={setInputMode}
        maaPaste={maaPaste}
        onMaaPasteChange={setMaaPaste}
        inputError={inputError}
        resultClearWarningDismissed={resultClearWarningDismissed}
        sklandSnapshot={sklandSnapshot}
        sklandConfigured={sklandConfigured}
        sklandDisabledReason={sklandDisabledReason}
        sklandBusy={sklandBusy}
        onOpenSkland={openSklandFromSetup}
        onRefreshSkland={handleSklandRefresh}
        onUseSkland={handleUseCurrentSklandBox}
        onMaaFile={handleFile}
        onMaaPaste={handleMaaPaste}
        onLoadSample={handleLoadSample}
        presets={PRESETS}
        preset={preset}
        layout={layout}
        onPresetSelect={handlePresetSelect}
        onLayoutFile={handleLayoutFile}
        onDownloadLayout={() => downloadJson(`layout-${layout.template}.json`, layout)}
        onRestoreResultClearWarning={restoreResultClearWarning}
        onFactoryRecipeChange={handleFactoryRecipeChange}
        onTradeOrderChange={handleTradeOrderChange}
        onRoomLevelChange={handleRoomLevelChange}
        powerBudget={powerBudget}
        onFinish={closeSetup}
        onSkip={closeSetup}
      />

      <IssueNoteModal
        open={issueOpen}
        row={issueDraftRow}
        note={issueDraftNote}
        saving={feedbackSaving}
        onNoteChange={setIssueDraftNote}
        onSave={handleSaveIssue}
        onCancel={handleCancelIssue}
      />

      <aside
        className="fixed bottom-4 right-4 z-30 w-[min(360px,calc(100vw-2rem))] rounded-lg border border-amber-200 bg-background/95 p-3 text-sm shadow-lg backdrop-blur"
        aria-label="鐩墠宸茬煡闂"
      >
        <strong className="block text-sm font-medium">鐩墠宸茬煡闂</strong>
        <ul className="mt-2 grid gap-1 pl-4 text-xs leading-5 text-muted-foreground">
          {KNOWN_ISSUES.map((issue) => (
            <li key={issue} className="list-disc">
              {issue}
            </li>
          ))}
        </ul>
      </aside>
    </main>
  );
}

export default WorkbenchApp;

