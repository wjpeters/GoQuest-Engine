import { emptyFeatureMatrix, type FrameState, type Renderer, type RendererCapabilities, type RendererDiagnostics } from "./Renderer";
import type { Scene } from "../scene/Scene";
import type { EntitySpec, WorldSpec } from "../quest/WorldSpec";
import { pickEntityAt } from "../input/Picking";

export class Canvas2DRenderer implements Renderer {
  readonly mode = "canvas2d" as const;
  private ctx: CanvasRenderingContext2D;
  private world?: WorldSpec;
  private capabilities: RendererCapabilities;
  private diagnostics: RendererDiagnostics;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas2D is not available in this browser.");
    }
    this.ctx = ctx;
    this.capabilities = {
      backend: "canvas2d",
      supported: true,
      experimental: false,
      available: true,
      features: {
        ...emptyFeatureMatrix(false),
        "2d.labels": true,
        "materials.color": true,
        "materials.opacity": true,
        "fallback.staticPreview": true,
      },
      limits: {
        maxEntitiesRecommended: 80,
      },
    };
    this.diagnostics = {
      selectedBackend: "canvas2d",
      attemptedBackends: [{ backend: "canvas2d", available: true }],
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      isSecureContext: typeof window !== "undefined" ? window.isSecureContext : undefined,
    };
  }

  init() {
    // Canvas2D has no async initialization.
  }

  resize(width: number, height: number, dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1) {
    const ratio = Math.max(1, dpr || 1);
    this.canvas.width = Math.floor(width * ratio);
    this.canvas.height = Math.floor(height * ratio);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  loadWorld(worldSpec: WorldSpec) {
    this.world = worldSpec;
  }

  render(sceneOrFrameState?: Scene | FrameState, maybeWorld?: WorldSpec) {
    const frameState = isFrameState(sceneOrFrameState) ? sceneOrFrameState : undefined;
    const scene = frameState?.scene ?? (isScene(sceneOrFrameState) ? sceneOrFrameState : undefined);
    const world = frameState?.world ?? maybeWorld ?? this.world;
    if (!scene || !world) {
      return;
    }
    this.world = world;
    const { ctx } = this;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    ctx.fillStyle = world.environment.background;
    ctx.fillRect(0, 0, width, height);
    scene.all().forEach((entity) => {
      if (!entity.spec.visible) {
        return;
      }
      const [x, y, z] = entity.spec.transform.position;
      const scale = entity.spec.transform.scale;
      const size = Math.max(12, 42 / (z + 6));
      ctx.globalAlpha = entity.spec.material.opacity;
      ctx.fillStyle = entity.spec.material.emissive ?? entity.spec.material.color;
      ctx.fillRect(width / 2 + x * 56 - size / 2, height / 2 - y * 56 - size / 2, size * scale[0], size * scale[1]);
    });
    ctx.globalAlpha = 1;
  }

  pick(screenX: number, screenY: number): EntitySpec | null {
    if (!this.world) {
      return null;
    }
    return pickEntityAt(this.world, screenX, screenY, this.canvas.clientWidth, this.canvas.clientHeight) ?? null;
  }

  dispose() {
    // Canvas2D has no retained GPU resources.
  }

  getCapabilities() {
    return this.capabilities;
  }

  getDiagnostics() {
    return this.diagnostics;
  }
}

function isFrameState(value: unknown): value is FrameState {
  return value !== null && typeof value === "object" && "world" in value;
}

function isScene(value: unknown): value is Scene {
  return value !== null && typeof value === "object" && "all" in value && typeof (value as Scene).all === "function";
}
