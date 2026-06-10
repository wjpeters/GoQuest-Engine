import { Canvas2DRenderer } from "./Canvas2DRenderer";
import {
  emptyFeatureMatrix,
  type Renderer,
  type RendererBackend,
  type RendererCapabilities,
  type RendererCapabilityIssue,
  type RendererDiagnostics,
  type RendererFeature,
} from "./Renderer";
import { StaticFallbackRenderer } from "./StaticFallbackRenderer";
import { WebGL2Renderer } from "./WebGL2Renderer";
import { WebGPURenderer } from "./WebGPURenderer";
import type { WorldSpec } from "../quest/WorldSpec";

export type RendererFallbackMode = "fail" | "degrade" | "static";

export type RendererCreateOptions = {
  canvas: HTMLCanvasElement;
  worldSpec?: WorldSpec;
  prefer?: RendererBackend[];
  requiredFeatures?: RendererFeature[];
  allowExperimental?: boolean;
  fallbackMode?: RendererFallbackMode;
  diagnostics?: boolean;
};

export type RendererSelectionResult = {
  renderer: Renderer;
  backend: RendererBackend;
  capabilities: RendererCapabilities;
  selectedBecause: string;
  degraded: boolean;
  degradationWarnings: RendererCapabilityIssue[];
  diagnostics: RendererDiagnostics;
};

export type RendererPolicy = {
  defaultBackend: RendererBackend;
  prefer: RendererBackend[];
  allowExperimental: boolean;
  fallbackMode: RendererFallbackMode;
  includeCanvas2DFallback: boolean;
  includeStaticFallback: boolean;
  requiredFeatures: RendererFeature[];
};

export const EXPORT_RENDERER_POLICY: RendererPolicy = {
  defaultBackend: "webgl2",
  prefer: ["webgl2", "canvas2d", "static"],
  allowExperimental: false,
  fallbackMode: "degrade",
  includeCanvas2DFallback: true,
  includeStaticFallback: true,
  requiredFeatures: ["3d.primitives", "materials.color", "materials.opacity"],
};

export const EDITOR_RENDERER_POLICY: RendererPolicy = {
  defaultBackend: "webgl2",
  prefer: ["webgpu", "webgl2", "canvas2d", "static"],
  allowExperimental: false,
  fallbackMode: "degrade",
  includeCanvas2DFallback: true,
  includeStaticFallback: true,
  requiredFeatures: ["3d.primitives", "materials.color", "materials.opacity"],
};

type Detector = (canvas: HTMLCanvasElement) => RendererCapabilities;

const detectors: Record<RendererBackend, Detector> = {
  webgpu: detectWebGPUCapabilities,
  webgl2: detectWebGL2Capabilities,
  canvas2d: detectCanvas2DCapabilities,
  static: detectStaticFallbackCapabilities,
};

export class RendererFactory {
  static async create(options: RendererCreateOptions): Promise<RendererSelectionResult> {
    const prefer = normalizePrefer(options.prefer ?? EXPORT_RENDERER_POLICY.prefer);
    const requiredFeatures = options.requiredFeatures ?? [];
    const fallbackMode = options.fallbackMode ?? "degrade";
    const allowExperimental = options.allowExperimental ?? false;
    const attemptedBackends: RendererDiagnostics["attemptedBackends"] = [];
    const candidateResults: Array<{
      backend: RendererBackend;
      capabilities: RendererCapabilities;
      missingFeatures: RendererFeature[];
      issues: RendererCapabilityIssue[];
    }> = [];

    for (const backend of prefer) {
      const capabilities = detectors[backend](options.canvas);
      const issues: RendererCapabilityIssue[] = [];

      if (capabilities.experimental && !allowExperimental) {
        issues.push({
          code: "renderer_experimental_disabled",
          severity: "info",
          message: `${backend} is experimental and disabled by policy.`,
          backend,
        });
        attemptedBackends.push({ backend, available: false, reason: "Experimental renderer disabled by policy.", issues });
        continue;
      }

      if (!capabilities.available || !capabilities.supported) {
        issues.push({
          code: "renderer_unavailable",
          severity: backend === "static" ? "warn" : "info",
          message: `${backend} is not available in this environment.`,
          backend,
        });
        attemptedBackends.push({ backend, available: false, reason: "Renderer capability detection failed.", issues });
        continue;
      }

      const missingFeatures = requiredFeatures.filter((feature) => !capabilities.features[feature]);
      missingFeatures.forEach((feature) => {
        issues.push({
          code: "renderer_feature_missing",
          severity: fallbackMode === "fail" ? "error" : "warn",
          message: `${backend} does not support required feature ${feature}.`,
          backend,
          feature,
        });
      });

      attemptedBackends.push({
        backend,
        available: true,
        reason: missingFeatures.length > 0 ? "Available with feature degradation." : "Available and satisfies required features.",
        issues,
      });
      candidateResults.push({ backend, capabilities, missingFeatures, issues });

      if (missingFeatures.length === 0) {
        return this.instantiateSelection({
          options,
          backend,
          capabilities,
          attemptedBackends,
          selectedBecause: `${backend} is the first available backend that satisfies required features.`,
          degraded: false,
          degradationWarnings: [],
        });
      }

      if (fallbackMode === "fail") {
        throw new Error(`Renderer ${backend} is missing required features: ${missingFeatures.join(", ")}`);
      }
    }

    const fallback = chooseFallback(candidateResults, fallbackMode);
    if (!fallback) {
      throw new Error("No renderer backend is available.");
    }

    const degradationWarnings = fallback.issues.filter((issue) => issue.severity !== "info");
    return this.instantiateSelection({
      options,
      backend: fallback.backend,
      capabilities: fallback.capabilities,
      attemptedBackends,
      selectedBecause: fallback.backend === "static" ? "Static fallback selected to avoid a blank viewport." : `${fallback.backend} selected with degradation warnings.`,
      degraded: true,
      degradationWarnings,
    });
  }

  private static async instantiateSelection(input: {
    options: RendererCreateOptions;
    backend: RendererBackend;
    capabilities: RendererCapabilities;
    attemptedBackends: RendererDiagnostics["attemptedBackends"];
    selectedBecause: string;
    degraded: boolean;
    degradationWarnings: RendererCapabilityIssue[];
  }): Promise<RendererSelectionResult> {
    const renderer = createRenderer(input.backend, input.options.canvas);
    if (input.options.worldSpec) {
      renderer.loadWorld(input.options.worldSpec);
    }
    await renderer.init();

    const diagnostics: RendererDiagnostics = {
      selectedBackend: input.backend,
      attemptedBackends: input.attemptedBackends,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      isSecureContext: typeof window !== "undefined" ? window.isSecureContext : undefined,
    };

    return {
      renderer,
      backend: input.backend,
      capabilities: input.capabilities,
      selectedBecause: input.selectedBecause,
      degraded: input.degraded,
      degradationWarnings: input.degradationWarnings,
      diagnostics,
    };
  }
}

export function detectWebGPUCapabilities(_canvas?: HTMLCanvasElement): RendererCapabilities {
  const hasNavigator = typeof navigator !== "undefined";
  const hasGpu = hasNavigator && "gpu" in navigator;
  const secure = typeof window === "undefined" ? true : window.isSecureContext;

  return {
    backend: "webgpu",
    supported: false,
    experimental: true,
    secureContextRequired: true,
    available: Boolean(hasGpu && secure),
    features: {
      ...emptyFeatureMatrix(false),
      "3d.primitives": true,
      "materials.color": true,
      "materials.opacity": true,
      "camera.perspective": true,
    },
    limits: {
      maxEntitiesRecommended: 300,
    },
  };
}

export function detectWebGL2Capabilities(canvas?: HTMLCanvasElement): RendererCapabilities {
  const features = {
    ...emptyFeatureMatrix(false),
    "3d.primitives": true,
    "3d.lighting.basic": true,
    "3d.picking": true,
    "materials.color": true,
    "materials.opacity": true,
    "camera.perspective": true,
  };

  try {
    const gl = canvas?.getContext?.("webgl2", { antialias: true, alpha: true }) as WebGL2RenderingContext | null | undefined;
    if (!gl) {
      return unavailableCapabilities("webgl2", features);
    }

    return {
      backend: "webgl2",
      supported: true,
      experimental: false,
      available: true,
      features,
      limits: {
        maxTextureSize: safeGetParameter(gl, gl.MAX_TEXTURE_SIZE),
        maxVertexUniforms: safeGetParameter(gl, gl.MAX_VERTEX_UNIFORM_VECTORS),
        maxEntitiesRecommended: 250,
      },
    };
  } catch {
    return unavailableCapabilities("webgl2", features);
  }
}

export function detectCanvas2DCapabilities(canvas?: HTMLCanvasElement): RendererCapabilities {
  const features = {
    ...emptyFeatureMatrix(false),
    "2d.labels": true,
    "materials.color": true,
    "materials.opacity": true,
    "fallback.staticPreview": true,
  };

  try {
    const ctx = canvas?.getContext?.("2d") as CanvasRenderingContext2D | null | undefined;
    return {
      backend: "canvas2d",
      supported: Boolean(ctx),
      experimental: false,
      available: Boolean(ctx),
      features,
      limits: {
        maxEntitiesRecommended: 80,
      },
    };
  } catch {
    return unavailableCapabilities("canvas2d", features);
  }
}

export function detectStaticFallbackCapabilities(): RendererCapabilities {
  return {
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
}

function createRenderer(backend: RendererBackend, canvas: HTMLCanvasElement): Renderer {
  if (backend === "webgl2") {
    return new WebGL2Renderer(canvas);
  }
  if (backend === "canvas2d") {
    return new Canvas2DRenderer(canvas);
  }
  if (backend === "webgpu") {
    return new WebGPURenderer();
  }
  return new StaticFallbackRenderer(canvas);
}

function normalizePrefer(prefer: RendererBackend[]): RendererBackend[] {
  const seen = new Set<RendererBackend>();
  const ordered: RendererBackend[] = [...prefer, "static"];
  return ordered.filter((backend) => {
    if (seen.has(backend)) {
      return false;
    }
    seen.add(backend);
    return true;
  });
}

function chooseFallback(
  candidateResults: Array<{
    backend: RendererBackend;
    capabilities: RendererCapabilities;
    missingFeatures: RendererFeature[];
    issues: RendererCapabilityIssue[];
  }>,
  fallbackMode: RendererFallbackMode,
) {
  const lastCandidate = candidateResults.length > 0 ? candidateResults[candidateResults.length - 1] : undefined;
  if (fallbackMode === "static") {
    return candidateResults.find((candidate) => candidate.backend === "static") ?? lastCandidate;
  }

  return candidateResults.find((candidate) => candidate.backend !== "webgpu") ?? lastCandidate;
}

function unavailableCapabilities(backend: RendererBackend, features: RendererCapabilities["features"]): RendererCapabilities {
  return {
    backend,
    supported: false,
    experimental: backend === "webgpu",
    secureContextRequired: backend === "webgpu",
    available: false,
    features,
  };
}

function safeGetParameter(gl: WebGL2RenderingContext, parameter: number) {
  try {
    const value = gl.getParameter(parameter);
    return typeof value === "number" ? value : undefined;
  } catch {
    return undefined;
  }
}
