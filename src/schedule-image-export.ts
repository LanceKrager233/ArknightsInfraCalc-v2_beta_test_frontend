export function scheduleImageFileName(layoutName: string, shiftLabel: string) {
  const safePart = (value: string, fallback: string) => {
    const normalized = Array.from(value)
      .filter((character) => character.charCodeAt(0) >= 32)
      .join("")
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    return normalized || fallback;
  };
  return `${safePart(layoutName, "基建排班")}-${safePart(shiftLabel, "当前班次")}.png`;
}

export function scheduleImageWidth(boardWidth: number) {
  return Math.max(320, Math.min(1280, Math.ceil(boardWidth)));
}

export function scheduleImagePixelRatio(width: number, height: number) {
  const maxDimension = 16_384;
  const maxArea = 64_000_000;
  const dimensionRatio = maxDimension / Math.max(width, height, 1);
  const areaRatio = Math.sqrt(maxArea / Math.max(width * height, 1));
  return Math.max(0.5, Math.min(2, dimensionRatio, areaRatio));
}

const MODERN_COLOR_PATTERN = /(?:oklab|lab|oklch|lch|color)\([^)]*\)/gi;
const COLOR_STYLE_PROPERTIES = [
  "color",
  "backgroundColor",
  "backgroundImage",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "textDecorationColor",
  "textShadow",
  "boxShadow",
  "fill",
  "stroke",
] as const;

async function normalizeModernColors(root: HTMLElement) {
  const { default: Color } = await import("colorjs.io");
  const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  for (const element of elements) {
    const computed = getComputedStyle(element);
    for (const property of COLOR_STYLE_PROPERTIES) {
      const value = computed[property];
      if (!value || !MODERN_COLOR_PATTERN.test(value)) {
        MODERN_COLOR_PATTERN.lastIndex = 0;
        continue;
      }
      MODERN_COLOR_PATTERN.lastIndex = 0;
      if (property === "boxShadow" || property === "textShadow") {
        element.style.boxShadow = "none";
        element.style.textShadow = "none";
        continue;
      }
      const normalized = value.replace(MODERN_COLOR_PATTERN, (color) => {
        try {
          return new Color(color).to("srgb").toString({ format: "rgb" });
        } catch {
          return color;
        }
      });
      MODERN_COLOR_PATTERN.lastIndex = 0;
      element.style[property] = normalized;
    }
  }
}

async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(images.map((image) => {
    if (image.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const finish = () => resolve();
      image.addEventListener("load", finish, { once: true });
      image.addEventListener("error", finish, { once: true });
      window.setTimeout(finish, 5_000);
    });
  }));
}

export type ScheduleImageCapture = { canvas: HTMLCanvasElement; label: string };

export async function captureScheduleImage({
  board,
  layoutName,
  shiftLabel,
}: {
  board: HTMLElement;
  layoutName: string;
  shiftLabel: string;
}): Promise<ScheduleImageCapture> {
  await document.fonts.ready;
  const width = scheduleImageWidth(board.getBoundingClientRect().width);
  const wrapper = document.createElement("div");
  wrapper.setAttribute("aria-hidden", "true");
  wrapper.dataset.scheduleImageRoot = "true";
  Object.assign(wrapper.style, {
    position: "absolute",
    left: "0",
    top: `${document.documentElement.scrollHeight + 100}px`,
    zIndex: "0",
    boxSizing: "border-box",
    width: `${width + 72}px`,
    maxWidth: "none",
    padding: "36px",
    color: "#252525",
    background: "#f7f5ec",
    fontFamily: getComputedStyle(document.body).fontFamily,
  });

  const header = document.createElement("header");
  header.style.cssText = "display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:24px;padding-bottom:18px;border-bottom:2px solid #252525";
  const heading = document.createElement("div");
  const eyebrow = document.createElement("div");
  eyebrow.textContent = "ARKNIGHTS INFRA SCHEDULE";
  eyebrow.style.cssText = "font-size:12px;letter-spacing:.16em;color:#147a74;font-weight:700";
  const title = document.createElement("div");
  title.textContent = layoutName;
  title.style.cssText = "margin-top:7px;font-size:30px;font-weight:700";
  heading.append(eyebrow, title);
  const shift = document.createElement("strong");
  shift.textContent = shiftLabel;
  shift.style.cssText = "padding:8px 12px;background:#252525;color:white;font-size:14px;white-space:nowrap";
  header.append(heading, shift);

  const clonedBoard = board.cloneNode(true) as HTMLElement;
  Object.assign(clonedBoard.style, {
    boxSizing: "border-box",
    width: `${width}px`,
    maxWidth: "none",
  });
  clonedBoard.querySelectorAll("button").forEach((button) => {
    button.setAttribute("tabindex", "-1");
    button.style.pointerEvents = "none";
  });
  const footer = document.createElement("footer");
  footer.textContent = "可露希尔基建终端 · 非官方排班辅助工具";
  footer.style.cssText = "margin-top:20px;padding-top:14px;border-top:1px solid rgba(37,37,37,.18);font-size:12px;color:rgba(37,37,37,.55);text-align:right";
  wrapper.append(header, clonedBoard, footer);
  document.body.append(wrapper);

  try {
    await waitForImages(wrapper);
    await normalizeModernColors(wrapper);
    const { default: html2canvas } = await import("html2canvas");
    const exportWidth = Math.ceil(wrapper.scrollWidth);
    const exportHeight = Math.ceil(wrapper.scrollHeight);
    const pixelRatio = scheduleImagePixelRatio(exportWidth, exportHeight);
    const canvas = await html2canvas(wrapper, {
      backgroundColor: "#f7f5ec",
      scale: pixelRatio,
      width: exportWidth,
      height: exportHeight,
      useCORS: true,
      logging: false,
      removeContainer: true,
      onclone: async (documentClone) => {
        const exportReset = documentClone.createElement("style");
        exportReset.textContent = "[data-schedule-image-root] *,[data-schedule-image-root] *::before,[data-schedule-image-root] *::after{animation:none!important;transition:none!important}[data-schedule-image-root] *::before,[data-schedule-image-root] *::after{content:none!important}";
        documentClone.head.append(exportReset);
        await normalizeModernColors(documentClone.documentElement);
        const clonedRoot = documentClone.querySelector<HTMLElement>("[data-schedule-image-root]");
        if (clonedRoot) await normalizeModernColors(clonedRoot);
      },
    });
    return { canvas, label: shiftLabel };
  } finally {
    wrapper.remove();
  }
}

async function downloadCanvas(canvas: HTMLCanvasElement, fileName: string) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("图片生成失败。");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function exportScheduleImage(input: { board: HTMLElement; layoutName: string; shiftLabel: string }) {
  const capture = await captureScheduleImage(input);
  await downloadCanvas(capture.canvas, scheduleImageFileName(input.layoutName, input.shiftLabel));
}

export async function exportCombinedScheduleImage(layoutName: string, captures: ScheduleImageCapture[]) {
  if (!captures.length) throw new Error("没有可导出的班次。");
  const gap = 28;
  const width = Math.max(...captures.map(({ canvas }) => canvas.width));
  const height = captures.reduce((total, { canvas }) => total + canvas.height, gap * (captures.length - 1));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("图片画布创建失败。");
  context.fillStyle = "#f7f5ec";
  context.fillRect(0, 0, width, height);
  let y = 0;
  for (const capture of captures) {
    context.drawImage(capture.canvas, Math.floor((width - capture.canvas.width) / 2), y);
    y += capture.canvas.height + gap;
  }
  await downloadCanvas(canvas, scheduleImageFileName(layoutName, "全部班次"));
}
