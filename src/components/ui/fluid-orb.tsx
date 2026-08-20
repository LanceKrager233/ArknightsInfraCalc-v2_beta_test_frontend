"use client";

import { useEffect, useRef, type ComponentProps } from "react";

import { cn } from "@/lib/utils";

export type FluidOrbProps = ComponentProps<"div"> & {
  size?: number;
  color?: string;
};

type RgbColor = readonly [red: number, green: number, blue: number];

function colorComponents(hex: string): RgbColor {
  const normalized = hex.replace("#", "").trim();
  const expanded = normalized.length === 3
    ? normalized.split("").map((character) => `${character}${character}`).join("")
    : normalized;
  const value = Number.parseInt(expanded, 16);
  if (expanded.length !== 6 || Number.isNaN(value)) return [26, 115, 242];
  return [
    (value >> 16) & 255,
    (value >> 8) & 255,
    value & 255,
  ];
}

function rgba(color: RgbColor, alpha: number): string {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
}

function drawFluidOrb(
  context: CanvasRenderingContext2D,
  pixels: number,
  color: RgbColor,
  elapsedSeconds: number,
) {
  const center = pixels / 2;
  const radius = pixels / 2;
  const phase = elapsedSeconds * 0.9;

  context.clearRect(0, 0, pixels, pixels);
  context.save();
  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.clip();

  const atmosphere = context.createLinearGradient(0, 0, 0, pixels);
  atmosphere.addColorStop(0, "#fbffff");
  atmosphere.addColorStop(0.54, "#f7fbfa");
  atmosphere.addColorStop(1, rgba(color, 0.28));
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, pixels, pixels);

  const liquid = context.createLinearGradient(0, pixels * 0.38, 0, pixels);
  liquid.addColorStop(0, rgba(color, 0.38));
  liquid.addColorStop(0.45, rgba(color, 0.78));
  liquid.addColorStop(1, rgba(color, 1));
  context.fillStyle = liquid;
  context.beginPath();
  context.moveTo(0, pixels);
  for (let point = 0; point <= 48; point += 1) {
    const progress = point / 48;
    const x = progress * pixels;
    const primaryWave = Math.sin(progress * Math.PI * 2.2 + phase) * pixels * 0.055;
    const secondaryWave = Math.sin(progress * Math.PI * 4.7 - phase * 0.72 + 1.1) * pixels * 0.026;
    const drift = Math.sin(phase * 0.54 + 0.8) * pixels * 0.026;
    context.lineTo(x, pixels * 0.56 + primaryWave + secondaryWave + drift);
  }
  context.lineTo(pixels, pixels);
  context.closePath();
  context.fill();

  const lightX = pixels * (0.28 + Math.sin(phase * 0.43) * 0.055);
  const lightY = pixels * (0.24 + Math.cos(phase * 0.37) * 0.035);
  const highlight = context.createRadialGradient(lightX, lightY, 0, lightX, lightY, pixels * 0.48);
  highlight.addColorStop(0, "rgba(255, 255, 255, 0.74)");
  highlight.addColorStop(0.55, "rgba(255, 255, 255, 0.18)");
  highlight.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = highlight;
  context.fillRect(0, 0, pixels, pixels);

  const depthX = pixels * (0.68 + Math.cos(phase * 0.39) * 0.08);
  const depthY = pixels * (0.72 + Math.sin(phase * 0.31) * 0.05);
  const depth = context.createRadialGradient(depthX, depthY, 0, depthX, depthY, pixels * 0.52);
  depth.addColorStop(0, rgba(color, 0.24));
  depth.addColorStop(1, rgba(color, 0));
  context.fillStyle = depth;
  context.fillRect(0, 0, pixels, pixels);
  context.restore();
}

export function FluidOrb({
  size = 56,
  color = "#1A73F2",
  className,
  style,
  ...props
}: FluidOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = canvas?.parentElement;
    if (!canvas || !root) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) {
      root.dataset.fluidOrbMotion = "fallback";
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixels = Math.max(1, Math.round(size * dpr));
    const components = colorComponents(color);
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const startedAt = performance.now();
    canvas.width = pixels;
    canvas.height = pixels;

    let reduceMotion = motionQuery.matches;
    let inViewport = true;
    let frame = 0;

    const render = (now: number) => {
      frame = 0;
      drawFluidOrb(context, pixels, components, reduceMotion ? 0 : (now - startedAt) / 1_000);
      root.dataset.fluidOrbMotion = reduceMotion ? "still" : "animated";
      if (!reduceMotion && inViewport && !document.hidden) {
        frame = window.requestAnimationFrame(render);
      }
    };

    const restart = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      render(performance.now());
    };
    const observer = new IntersectionObserver(([entry]) => {
      inViewport = entry?.isIntersecting ?? true;
      restart();
    });
    const handleMotionChange = (event: MediaQueryListEvent) => {
      reduceMotion = event.matches;
      restart();
    };

    observer.observe(root);
    motionQuery.addEventListener("change", handleMotionChange);
    document.addEventListener("visibilitychange", restart);
    restart();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      motionQuery.removeEventListener("change", handleMotionChange);
      document.removeEventListener("visibilitychange", restart);
    };
  }, [color, size]);

  return (
    <div
      data-slot="fluid-orb"
      data-fluid-orb-color={color}
      className={cn("relative isolate shrink-0 overflow-hidden rounded-full", className)}
      style={{ width: size, height: size, contain: "layout paint size", ...style }}
      {...props}
    >
      <span
        className="absolute inset-0 rounded-[inherit]"
        style={{
          backgroundColor: color,
          backgroundImage: `radial-gradient(circle at 32% 20%, #fbffff 0 22%, color-mix(in srgb, ${color} 42%, white) 52%, ${color} 88%)`,
        }}
        aria-hidden="true"
        data-fluid-orb-fallback
      />
      <canvas ref={canvasRef} className="absolute inset-0 size-full" aria-hidden="true" />
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-black/6" aria-hidden="true" />
    </div>
  );
}
