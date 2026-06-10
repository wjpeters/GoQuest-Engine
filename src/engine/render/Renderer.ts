import type { Scene } from "../scene/Scene";
import type { EntitySpec, WorldSpec } from "../quest/WorldSpec";

export type RendererBackend = "webgpu" | "webgl2" | "canvas2d" | "static";

export type RendererFeature =
  | "3d.primitives"
  | "3d.lighting.basic"
  | "3d.picking"
  | "2d.labels"
  | "materials.color"
  | "materials.opacity"
  | "assets.imageBillboard"
  | "camera.orbit"
  | "camera.perspective"
  | "fallback.staticPreview";

export const RENDERER_FEATURES = [
  "3d.primitives",
  "3d.lighting.basic",
  "3d.picking",
  "2d.labels",
  "materials.color",
  "materials.opacity",
  "assets.imageBillboard",
  "camera.orbit",
  "camera.perspective",
  "fallback.staticPreview",
] as const satisfies readonly RendererFeature[];

export type RendererCapabilityIssue = {
  code: string;
  severity: "info" | "warn" | "error";
  message: string;
  feature?: RendererFeature;
  backend?: RendererBackend;
};

export type RendererCapabilities = {
  backend: RendererBackend;
  supported: boolean;
  experimental: boolean;
  secureContextRequired?: boolean;
  available: boolean;
  features: Record<RendererFeature, boolean>;
  limits?: {
    maxTextureSize?: number;
    maxVertexUniforms?: number;
    maxEntitiesRecommended?: number;
  };
};

export type RendererDiagnostics = {
  selectedBackend: RendererBackend;
  attemptedBackends: Array<{
    backend: RendererBackend;
    available: boolean;
    reason?: string;
    issues?: RendererCapabilityIssue[];
  }>;
  userAgent?: string;
  isSecureContext?: boolean;
  firstRenderMs?: number;
};

export type FrameState = {
  scene?: Scene;
  world: WorldSpec;
  timeMs?: number;
  deltaMs?: number;
};

export interface Renderer {
  readonly mode: RendererBackend;
  init(): void | Promise<void>;
  resize(width: number, height: number, dpr?: number): void;
  loadWorld(worldSpec: WorldSpec): void;
  render(sceneOrFrameState?: Scene | FrameState, world?: WorldSpec): void;
  pick(screenX: number, screenY: number): EntitySpec | null;
  dispose(): void;
  getCapabilities(): RendererCapabilities;
  getDiagnostics(): RendererDiagnostics;
}

export function emptyFeatureMatrix(defaultValue = false): Record<RendererFeature, boolean> {
  return {
    "3d.primitives": defaultValue,
    "3d.lighting.basic": defaultValue,
    "3d.picking": defaultValue,
    "2d.labels": defaultValue,
    "materials.color": defaultValue,
    "materials.opacity": defaultValue,
    "assets.imageBillboard": defaultValue,
    "camera.orbit": defaultValue,
    "camera.perspective": defaultValue,
    "fallback.staticPreview": defaultValue,
  };
}
