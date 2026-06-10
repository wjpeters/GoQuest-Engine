import type { BundleManifest } from "../../BundleManifest";
import type { WorldSpec } from "../../../quest/WorldSpec";
import type { ExportHealthCheck } from "../ExportHealthReport";
import { check } from "./shared";

export function validateRendererPolicy(world: WorldSpec, manifest: BundleManifest): ExportHealthCheck[] {
  return [
    validateRendererCapabilitiesDeclared(manifest),
    validateRequiredRendererFeatures(world, manifest),
    validateWebGL2Default(manifest),
    validateCanvasFallback(manifest),
    validateWebGPUNotRequired(world, manifest),
    validateStaticFallback(manifest),
    validateDegradationPolicy(world, manifest),
  ];
}

function validateRendererCapabilitiesDeclared(manifest: BundleManifest): ExportHealthCheck {
  const hasPolicy = Boolean(manifest.rendererPolicy);
  const hasContractPolicy = Boolean(manifest.contract.rendererPolicy);
  const hasRenderers = manifest.capabilities.renderers.includes("webgl2") && manifest.capabilities.renderers.includes("canvas2d");

  if (hasPolicy && hasContractPolicy && hasRenderers) {
    return check("renderer_capabilities_declared", "Renderer capabilities declared", "pass", "Manifest declares renderer policy and runtime feature support.");
  }

  return check("renderer_capabilities_declared", "Renderer capabilities declared", "fail", "Renderer capability metadata is incomplete.", {
    hasPolicy,
    hasContractPolicy,
    renderers: manifest.capabilities.renderers,
  });
}

function validateRequiredRendererFeatures(world: WorldSpec, manifest: BundleManifest): ExportHealthCheck {
  const featureSupport = manifest.contract.rendererPolicy.featureSupport.webgl2 ?? {};
  const rendererFeatures = world.requiredCapabilities.filter((capability) => !capability.includes(":"));
  const missing = rendererFeatures.filter((feature) => featureSupport[feature] !== true);

  if (missing.length === 0) {
    return check("required_renderer_features_supported", "Required renderer features supported", "pass", "WebGL2 satisfies required renderer features.");
  }

  if (manifest.rendererPolicy.fallbackMode === "degrade" && manifest.rendererPolicy.fallbackModesAvailable.length > 0) {
    return check(
      "required_renderer_features_supported",
      "Required renderer features supported",
      "warn",
      "Some required renderer features need degraded fallback behavior.",
      { missing, fallbackModesAvailable: manifest.rendererPolicy.fallbackModesAvailable },
    );
  }

  return check("required_renderer_features_supported", "Required renderer features supported", "fail", "Required renderer features cannot be satisfied.", {
    missing,
  });
}

function validateWebGL2Default(manifest: BundleManifest): ExportHealthCheck {
  if (manifest.rendererPolicy.defaultBackend === "webgl2" && manifest.capabilities.renderers.includes("webgl2")) {
    return check("webgl2_available_in_runtime", "WebGL2 default runtime", "pass", "WebGL2 is the default export renderer.");
  }

  return check("webgl2_available_in_runtime", "WebGL2 default runtime", "fail", "Customer exports must default to WebGL2 in V1.", {
    rendererPolicy: manifest.rendererPolicy,
  });
}

function validateCanvasFallback(manifest: BundleManifest): ExportHealthCheck {
  if (manifest.rendererPolicy.includeCanvas2DFallback && manifest.capabilities.renderers.includes("canvas2d")) {
    return check("canvas2d_fallback_available", "Canvas2D fallback available", "pass", "Canvas2D fallback is packaged for degraded rendering.");
  }

  return check("canvas2d_fallback_available", "Canvas2D fallback available", "warn", "Canvas2D fallback is not available; visual fallback quality is reduced.");
}

function validateWebGPUNotRequired(world: WorldSpec, manifest: BundleManifest): ExportHealthCheck {
  const webgpuRequired =
    world.requiredCapabilities.includes("renderer:webgpu") ||
    (world.preferredRenderer === "webgpu" && world.allowRendererDegradation === false) ||
    manifest.rendererPolicy.allowExperimentalWebGPU ||
    manifest.contract.rendererPolicy.webgpuRequiredForExport;

  if (!webgpuRequired) {
    return check("webgpu_not_required_for_export", "WebGPU not required", "pass", "Export does not require experimental WebGPU.");
  }

  return check("webgpu_not_required_for_export", "WebGPU not required", "fail", "WebGPU cannot be required for customer exports in V1.", {
    preferredRenderer: world.preferredRenderer,
    requiredCapabilities: world.requiredCapabilities,
    allowExperimentalWebGPU: manifest.rendererPolicy.allowExperimentalWebGPU,
  });
}

function validateStaticFallback(manifest: BundleManifest): ExportHealthCheck {
  if (manifest.rendererPolicy.includeStaticFallback && manifest.capabilities.renderers.includes("static")) {
    return check("static_fallback_available", "Static fallback available", "pass", "Static fallback is available to avoid blank exports.");
  }

  return check("static_fallback_available", "Static fallback available", "fail", "Static fallback is required to avoid blank exports.");
}

function validateDegradationPolicy(world: WorldSpec, manifest: BundleManifest): ExportHealthCheck {
  const valid = world.allowRendererDegradation
    ? manifest.rendererPolicy.fallbackMode === "degrade" && manifest.rendererPolicy.fallbackModesAvailable.length > 0
    : manifest.rendererPolicy.fallbackMode === "fail";

  if (valid) {
    return check("degradation_policy_valid", "Degradation policy valid", "pass", "Renderer fallback policy matches the WorldSpec export policy.");
  }

  return check("degradation_policy_valid", "Degradation policy valid", "fail", "Renderer fallback policy is inconsistent.", {
    allowRendererDegradation: world.allowRendererDegradation,
    rendererPolicy: manifest.rendererPolicy,
  });
}
