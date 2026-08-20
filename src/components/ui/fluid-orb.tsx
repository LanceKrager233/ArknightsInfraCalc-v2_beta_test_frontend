"use client";

import { useEffect, useRef, type ComponentProps } from "react";

import { cn } from "@/lib/utils";

export type FluidOrbProps = ComponentProps<"div"> & {
  size?: number;
  color?: string;
};

const VERTEX_SHADER = `
  attribute vec2 a_position;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

// Adapted for the website-account avatar from Rare UI's Fluid Orb:
// https://github.com/swamimalode07/rare-ui/blob/main/components/ui/fluid-orb.tsx
const FRAGMENT_SHADER = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec3 u_color;

  float hash(vec2 point) {
    return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 point) {
    vec2 cell = floor(point);
    vec2 offset = fract(point);
    vec2 curve = offset * offset * (3.0 - 2.0 * offset);
    return mix(
      mix(hash(cell), hash(cell + vec2(1.0, 0.0)), curve.x),
      mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)), curve.x),
      curve.y
    );
  }

  float fluidNoise(vec2 point) {
    float value = 0.0;
    float amplitude = 0.6;
    for (int octave = 0; octave < 3; octave++) {
      value += amplitude * noise(point);
      point *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float time = u_time * 0.22;
    vec2 drift = vec2(
      sin(time) + 0.6 * sin(time * 1.7 + 1.3),
      cos(time * 0.8) + 0.6 * cos(time * 1.3 + 2.1)
    );
    vec2 point = vec2(uv.x * 1.8, uv.y) + drift * 0.7;
    vec2 warp = vec2(
      fluidNoise(point + drift),
      fluidNoise(point + vec2(3.2, 1.5) - drift)
    );
    float fluid = fluidNoise(point + 1.2 * warp);
    float lowerBand = clamp(1.0 - uv.y, 0.0, 1.0);
    float body = smoothstep(0.0, 0.3, uv.y);
    float shade = clamp(lowerBand + (fluid - 0.5) * 0.8 * body, 0.0, 1.0);
    vec3 white = vec3(0.99, 1.0, 1.0);
    vec3 tint = mix(white, u_color, 0.5);
    vec3 color = mix(white, tint, smoothstep(0.28, 0.52, shade));
    color = mix(color, u_color, smoothstep(0.58, 0.88, shade));
    float edge = smoothstep(0.5, 0.49, distance(uv, vec2(0.5)));
    gl_FragColor = vec4(color * edge, edge);
  }
`;

function colorComponents(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "").trim();
  const expanded = normalized.length === 3
    ? normalized.split("").map((character) => `${character}${character}`).join("")
    : normalized;
  const value = Number.parseInt(expanded, 16);
  if (expanded.length !== 6 || Number.isNaN(value)) return [0.1, 0.45, 0.95];
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ];
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
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

    const gl = canvas.getContext("webgl", { alpha: true, antialias: true });
    if (!gl) {
      root.dataset.fluidOrbMotion = "fallback";
      return;
    }

    const program = gl.createProgram();
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!program || !vertexShader || !fragmentShader) {
      if (program) gl.deleteProgram(program);
      if (vertexShader) gl.deleteShader(vertexShader);
      if (fragmentShader) gl.deleteShader(fragmentShader);
      root.dataset.fluidOrbMotion = "fallback";
      return;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      root.dataset.fluidOrbMotion = "fallback";
      return;
    }

    gl.useProgram(program);
    const buffer = gl.createBuffer();
    const position = gl.getAttribLocation(program, "a_position");
    const resolution = gl.getUniformLocation(program, "u_resolution");
    const time = gl.getUniformLocation(program, "u_time");
    const uniformColor = gl.getUniformLocation(program, "u_color");
    if (!buffer || position < 0 || !resolution || !time || !uniformColor) {
      if (buffer) gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      root.dataset.fluidOrbMotion = "fallback";
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixels = Math.max(1, Math.round(size * dpr));
    canvas.width = pixels;
    canvas.height = pixels;
    gl.viewport(0, 0, pixels, pixels);
    gl.uniform2f(resolution, pixels, pixels);
    gl.uniform3f(uniformColor, ...colorComponents(color));

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const startedAt = performance.now();
    let reduceMotion = motionQuery.matches;
    let inViewport = true;
    let frame = 0;

    const render = (now: number) => {
      frame = 0;
      gl.uniform1f(time, reduceMotion ? 0 : (now - startedAt) / 1_000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
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
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
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
