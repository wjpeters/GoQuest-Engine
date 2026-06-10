import { emptyFeatureMatrix, type FrameState, type Renderer, type RendererCapabilities, type RendererDiagnostics } from "./Renderer";
import type { Scene } from "../scene/Scene";
import type { EntitySpec, WorldSpec } from "../quest/WorldSpec";

export class StaticFallbackRenderer implements Renderer {
  readonly mode = "static" as const;
  private ctx: CanvasRenderingContext2D | null;
  private world?: WorldSpec;
  private capabilities: RendererCapabilities = {
    backend: "static",
    supported: true,
    experimental: false,
    available: true,
    features: {
      ...emptyFeatureMatrix(false),
      "2d.labels": true,
      "fallback.staticPreview": true,
    },
    limits: {
      maxEntitiesRecommended: 40,
    },
  };
  private diagnostics: RendererDiagnostics = {
    selectedBackend: "static",
    attemptedBackends: [{ backend: "static", available: true, reason: "Static fallback is always available." }],
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    isSecureContext: typeof window !== "undefined" ? window.isSecureContext : undefined,
  };

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d");
  }

  init() {
    // Static fallback uses immediate Canvas2D text drawing when available.
  }

  resize(width: number, height: number, dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1) {
    const ratio = Math.max(1, dpr || 1);
    this.canvas.width = Math.floor(width * ratio);
    this.canvas.height = Math.floor(height * ratio);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  loadWorld(worldSpec: WorldSpec) {
    this.world = worldSpec;
  }

  render(sceneOrFrameState?: Scene | FrameState, maybeWorld?: WorldSpec) {
    const frameState = isFrameState(sceneOrFrameState) ? sceneOrFrameState : undefined;
    const world = frameState?.world ?? maybeWorld ?? this.world;
    if (!world || !this.ctx) {
      return;
    }
    this.world = world;

    const width = this.canvas.clientWidth || this.canvas.width || 800;
    const height = this.canvas.clientHeight || this.canvas.height || 480;
    const ctx = this.ctx;
    ctx.fillStyle = world.environment.background || "#080b14";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#eef2ff";
    ctx.font = "700 22px Inter, system-ui, sans-serif";
    ctx.fillText(world.title, 24, 42);

    ctx.fillStyle = "#b8c0d8";
    ctx.font = "13px Inter, system-ui, sans-serif";
    wrapText(ctx, world.description || "Interactive rendering is unavailable in this browser.", 24, 68, Math.min(520, width - 48), 18);

    ctx.fillStyle = "#facc15";
    ctx.font = "700 13px Inter, system-ui, sans-serif";
    ctx.fillText("Static fallback preview", 24, 132);

    const visibleEntities = world.entities.filter((entity) => entity.visible).slice(0, 8);
    visibleEntities.forEach((entity, index) => {
      const y = 162 + index * 34;
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      roundRect(ctx, 24, y - 18, Math.min(520, width - 48), 26, 7);
      ctx.fill();
      ctx.fillStyle = entity.material.color || "#8ab4ff";
      ctx.fillRect(36, y - 10, 10, 10);
      ctx.fillStyle = "#eef2ff";
      ctx.font = "12px Inter, system-ui, sans-serif";
      ctx.fillText(`${entity.name} (${entity.type})`, 56, y);
    });

    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.fillText("This package is still readable and standalone; use WebGL2 or Canvas2D for full interaction.", 24, Math.max(220, height - 28));
  }

  pick(): EntitySpec | null {
    return null;
  }

  dispose() {
    // Static fallback has no retained resources.
  }

  getCapabilities() {
    return this.capabilities;
  }

  getDiagnostics() {
    return this.diagnostics;
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(/\s+/);
  let line = "";
  let offset = 0;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y + offset);
      line = word;
      offset += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, y + offset);
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function isFrameState(value: unknown): value is FrameState {
  return value !== null && typeof value === "object" && "world" in value;
}
