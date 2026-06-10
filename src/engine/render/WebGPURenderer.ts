import { emptyFeatureMatrix, type FrameState, type Renderer, type RendererCapabilities, type RendererDiagnostics } from "./Renderer";
import type { Scene } from "../scene/Scene";
import type { EntitySpec, WorldSpec } from "../quest/WorldSpec";

export class WebGPURenderer implements Renderer {
  readonly mode = "webgpu" as const;
  private world?: WorldSpec;
  private capabilities: RendererCapabilities = {
    backend: "webgpu",
    supported: false,
    experimental: true,
    secureContextRequired: true,
    available: typeof navigator !== "undefined" && "gpu" in navigator,
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
  private diagnostics: RendererDiagnostics = {
    selectedBackend: "webgpu",
    attemptedBackends: [
      {
        backend: "webgpu",
        available: this.capabilities.available,
        reason: "WebGPU renderer is an experimental roadmap backend in this MVP.",
      },
    ],
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    isSecureContext: typeof window !== "undefined" ? window.isSecureContext : undefined,
  };

  init() {
    throw new Error("WebGPU renderer is experimental and not implemented for customer exports yet.");
  }

  resize() {
    // Reserved for the production renderer path. The MVP ships WebGL2 first.
  }

  loadWorld(worldSpec: WorldSpec) {
    this.world = worldSpec;
  }

  render(_sceneOrFrameState?: Scene | FrameState, _world?: WorldSpec) {
    throw new Error("WebGPU renderer is a roadmap stub in this MVP.");
  }

  pick(): EntitySpec | null {
    return null;
  }

  dispose() {
    // No resources until the WebGPU backend is implemented.
  }

  getCapabilities() {
    return this.capabilities;
  }

  getDiagnostics() {
    return this.diagnostics;
  }
}
