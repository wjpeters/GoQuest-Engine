import { z } from "zod";
import {
  ENGINE_NAME,
  EXPORT_FORMAT_VERSION,
  RUNTIME_VERSION,
  SUPPORTED_EXPORT_FORMAT_VERSIONS,
  SUPPORTED_SPEC_VERSIONS,
} from "./EngineVersion";
import { RENDERER_FEATURES } from "../render/Renderer";

export const RENDERER_CAPABILITIES = ["webgpu", "webgl2", "canvas2d", "static"] as const;
export const GEOMETRY_CAPABILITIES = ["box", "sphere", "plane", "cylinder", "cone", "text", "hotspot", "imageBillboard"] as const;
export const ASSET_CAPABILITIES = ["image", "audio", "data", "font"] as const;
export const ACTION_CAPABILITIES = [
  "setVariable",
  "incrementVariable",
  "addScore",
  "showMessage",
  "highlightEntity",
  "hideEntity",
  "showEntity",
  "moveCamera",
  "gotoStage",
  "completeQuest",
] as const;
export const CONDITION_CAPABILITIES = ["variableEquals", "variableAtLeast", "scoreAtLeast", "stageIs"] as const;
export const INTERACTION_CAPABILITIES = ["click", "hover", "enterZone", "sceneStart"] as const;
export const EXPORT_MODE_CAPABILITIES = ["single-html", "zip-static"] as const;

export const RuntimeContractSchema = z.object({
  engine: z.literal(ENGINE_NAME),
  runtimeVersion: z.string().min(1),
  supportedSpecVersions: z.array(z.string().min(1)).min(1),
  supportedExportFormatVersions: z.array(z.string().min(1)).min(1),
  capabilities: z.object({
    renderers: z.array(z.enum(["webgpu", "webgl2", "canvas2d", "static"])).min(1),
    geometry: z.array(z.string().min(1)).min(1),
    assets: z.array(z.string().min(1)),
    actions: z.array(z.string().min(1)).min(1),
    conditions: z.array(z.string().min(1)).min(1),
    interactions: z.array(z.string().min(1)).min(1),
    exportModes: z.array(z.enum(["single-html", "zip-static"])).min(1),
  }),
  featureFlags: z.record(z.boolean()).default({}),
  rendererPolicy: z.object({
    defaultBackend: z.enum(["webgpu", "webgl2", "canvas2d", "static"]),
    exportPrefer: z.array(z.enum(["webgpu", "webgl2", "canvas2d", "static"])).min(1),
    editorPrefer: z.array(z.enum(["webgpu", "webgl2", "canvas2d", "static"])).min(1),
    webgpuExperimental: z.boolean(),
    webgpuRequiredForExport: z.literal(false),
    fallbackMode: z.enum(["fail", "degrade", "static"]),
    fallbacks: z.array(z.enum(["canvas2d", "static"])).min(1),
    featureSupport: z.record(z.record(z.boolean())),
  }),
  diagnostics: z.object({
    version: z.string().min(1),
    globalReadyFlag: z.literal("__AQE_RUNTIME_READY__"),
    globalHealthObject: z.literal("__AQE_EXPORT_HEALTH__"),
    runtimeContractObject: z.literal("__AQE_RUNTIME_CONTRACT__"),
    testHooksObject: z.literal("__AQE_TEST_HOOKS__"),
  }),
});

export type RuntimeContract = z.infer<typeof RuntimeContractSchema>;

export const CURRENT_RUNTIME_CONTRACT: RuntimeContract = RuntimeContractSchema.parse({
  engine: ENGINE_NAME,
  runtimeVersion: RUNTIME_VERSION,
  supportedSpecVersions: [...SUPPORTED_SPEC_VERSIONS],
  supportedExportFormatVersions: [...SUPPORTED_EXPORT_FORMAT_VERSIONS],
  capabilities: {
    renderers: [...RENDERER_CAPABILITIES],
    geometry: [...GEOMETRY_CAPABILITIES],
    assets: [...ASSET_CAPABILITIES],
    actions: [...ACTION_CAPABILITIES],
    conditions: [...CONDITION_CAPABILITIES],
    interactions: [...INTERACTION_CAPABILITIES],
    exportModes: [...EXPORT_MODE_CAPABILITIES],
  },
  featureFlags: {
    standaloneRuntime: true,
    embeddedQuestSpec: true,
    staticExport: true,
    localDiagnostics: true,
  },
  rendererPolicy: {
    defaultBackend: "webgl2",
    exportPrefer: ["webgl2", "canvas2d", "static"],
    editorPrefer: ["webgpu", "webgl2", "canvas2d", "static"],
    webgpuExperimental: true,
    webgpuRequiredForExport: false,
    fallbackMode: "degrade",
    fallbacks: ["canvas2d", "static"],
    featureSupport: {
      webgpu: featureRecord(["3d.primitives", "materials.color", "materials.opacity", "camera.perspective"]),
      webgl2: featureRecord(["3d.primitives", "3d.lighting.basic", "3d.picking", "materials.color", "materials.opacity", "camera.perspective"]),
      canvas2d: featureRecord(["2d.labels", "materials.color", "materials.opacity", "fallback.staticPreview"]),
      static: featureRecord(["2d.labels", "fallback.staticPreview"]),
    },
  },
  diagnostics: {
    version: "1.0.0",
    globalReadyFlag: "__AQE_RUNTIME_READY__",
    globalHealthObject: "__AQE_EXPORT_HEALTH__",
    runtimeContractObject: "__AQE_RUNTIME_CONTRACT__",
    testHooksObject: "__AQE_TEST_HOOKS__",
  },
});

export function validateRuntimeContract(input: unknown) {
  return RuntimeContractSchema.safeParse(input);
}

export function getRequiredCapabilitySet(contract: RuntimeContract = CURRENT_RUNTIME_CONTRACT) {
  const rendererFeatures = new Set<string>();
  Object.values(contract.rendererPolicy.featureSupport).forEach((features) => {
    Object.entries(features).forEach(([feature, supported]) => {
      if (supported) {
        rendererFeatures.add(feature);
      }
    });
  });

  return new Set([
    ...rendererFeatures,
    ...contract.capabilities.renderers.map((value) => `renderer:${value}`),
    ...contract.capabilities.geometry.map((value) => `geometry:${value}`),
    ...contract.capabilities.assets.map((value) => `asset:${value}`),
    ...contract.capabilities.actions.map((value) => `action:${value}`),
    ...contract.capabilities.conditions.map((value) => `condition:${value}`),
    ...contract.capabilities.interactions.map((value) => `interaction:${value}`),
    ...contract.capabilities.exportModes.map((value) => `export:${value}`),
  ]);
}

export { EXPORT_FORMAT_VERSION };

function featureRecord(enabled: Array<(typeof RENDERER_FEATURES)[number]>) {
  return Object.fromEntries(RENDERER_FEATURES.map((feature) => [feature, enabled.includes(feature)]));
}
