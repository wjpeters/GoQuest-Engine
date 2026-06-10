import type { BundleManifest } from "../export/BundleManifest";
import type { ActionSpec } from "../quest/Actions";
import type { ConditionSpec } from "../quest/Conditions";
import type { WorldSpec } from "../quest/WorldSpec";
import { EXPORT_FORMAT_VERSION, SUPPORTED_EXPORT_FORMAT_VERSIONS, SUPPORTED_SPEC_VERSIONS } from "./EngineVersion";
import { CURRENT_RUNTIME_CONTRACT, getRequiredCapabilitySet, RuntimeContractSchema, type RuntimeContract } from "./RuntimeContract";

export type CompatibilityStatus = "compatible" | "warning" | "incompatible";
export type CompatibilitySeverity = "info" | "warn" | "error";

export type CompatibilityIssue = {
  code: string;
  severity: CompatibilitySeverity;
  message: string;
  details?: unknown;
};

export type CompatibilityResult = {
  status: CompatibilityStatus;
  issues: CompatibilityIssue[];
};

export function isSpecVersionSupported(specVersion: string, contract: RuntimeContract = CURRENT_RUNTIME_CONTRACT) {
  return contract.supportedSpecVersions.includes(specVersion);
}

export function isExportFormatSupported(exportFormatVersion: string, contract: RuntimeContract = CURRENT_RUNTIME_CONTRACT) {
  return contract.supportedExportFormatVersions.includes(exportFormatVersion);
}

export function checkRuntimeCompatibility(world: WorldSpec, runtimeContract: RuntimeContract = CURRENT_RUNTIME_CONTRACT): CompatibilityResult {
  const issues: CompatibilityIssue[] = [];
  const specVersion = world.specVersion ?? "0.0.0";

  if (!isSpecVersionSupported(specVersion, runtimeContract)) {
    issues.push({
      code: "spec_version_unsupported",
      severity: "error",
      message: `WorldSpec version ${specVersion} is not supported by runtime ${runtimeContract.runtimeVersion}.`,
      details: { specVersion, supportedSpecVersions: runtimeContract.supportedSpecVersions },
    });
  }

  if (world.requiredRuntimeVersion && world.requiredRuntimeVersion !== runtimeContract.runtimeVersion) {
    issues.push({
      code: "runtime_version_mismatch",
      severity: "warn",
      message: `WorldSpec requests runtime ${world.requiredRuntimeVersion}; export will use ${runtimeContract.runtimeVersion}.`,
      details: { requiredRuntimeVersion: world.requiredRuntimeVersion, runtimeVersion: runtimeContract.runtimeVersion },
    });
  }

  addMissingCapabilityIssues(issues, world.requiredCapabilities ?? [], runtimeContract);
  addUnsupportedUsedValues(issues, "geometry", world.entities.map((entity) => entity.type), runtimeContract.capabilities.geometry);
  addUnsupportedUsedValues(issues, "asset", world.assets.map((asset) => asset.type), runtimeContract.capabilities.assets);
  addUnsupportedUsedValues(issues, "interaction", world.interactions.map((interaction) => interaction.trigger), runtimeContract.capabilities.interactions);
  addUnsupportedUsedValues(issues, "action", collectActions(world).map((action) => action.type), runtimeContract.capabilities.actions);
  addUnsupportedUsedValues(issues, "condition", collectConditions(world).map((condition) => condition.type), runtimeContract.capabilities.conditions);

  return compatibilityResult(issues);
}

export function checkManifestCompatibility(
  manifest: BundleManifest,
  runtimeContract: RuntimeContract = CURRENT_RUNTIME_CONTRACT,
): CompatibilityResult {
  const issues: CompatibilityIssue[] = [];
  const contractResult = RuntimeContractSchema.safeParse(manifest.contract);

  if (!contractResult.success) {
    issues.push({
      code: "runtime_contract_invalid",
      severity: "error",
      message: "Manifest runtime contract does not match the contract schema.",
      details: contractResult.error.issues.map((issue) => ({ path: issue.path.join(".") || "(root)", message: issue.message })),
    });
  }

  if (!isSpecVersionSupported(manifest.specVersion, runtimeContract)) {
    issues.push({
      code: "manifest_spec_version_unsupported",
      severity: "error",
      message: `Manifest spec version ${manifest.specVersion} is not supported.`,
      details: { specVersion: manifest.specVersion, supportedSpecVersions: runtimeContract.supportedSpecVersions },
    });
  }

  if (!isExportFormatSupported(manifest.exportFormatVersion, runtimeContract)) {
    issues.push({
      code: "export_format_unsupported",
      severity: "error",
      message: `Export format ${manifest.exportFormatVersion} is not supported.`,
      details: { exportFormatVersion: manifest.exportFormatVersion, supportedExportFormatVersions: runtimeContract.supportedExportFormatVersions },
    });
  }

  if (manifest.contract.runtimeVersion !== manifest.runtimeVersion) {
    issues.push({
      code: "manifest_contract_runtime_mismatch",
      severity: "error",
      message: "Manifest runtimeVersion and contract runtimeVersion differ.",
      details: { manifestRuntimeVersion: manifest.runtimeVersion, contractRuntimeVersion: manifest.contract.runtimeVersion },
    });
  }

  if (manifest.exportFormatVersion !== EXPORT_FORMAT_VERSION) {
    issues.push({
      code: "current_export_format_mismatch",
      severity: "warn",
      message: `Manifest export format ${manifest.exportFormatVersion} differs from current exporter ${EXPORT_FORMAT_VERSION}.`,
      details: { currentExportFormatVersion: EXPORT_FORMAT_VERSION, manifestExportFormatVersion: manifest.exportFormatVersion },
    });
  }

  return compatibilityResult(issues);
}

export function getCompatibilityWarnings(...results: CompatibilityResult[]) {
  return results.flatMap((result) => result.issues.filter((issue) => issue.severity !== "error"));
}

export function assertCompatibleOrThrow(result: CompatibilityResult) {
  if (result.status !== "incompatible") {
    return;
  }

  const message = result.issues
    .filter((issue) => issue.severity === "error")
    .map((issue) => `${issue.code}: ${issue.message}`)
    .join("\n");
  throw new Error(message || "Runtime compatibility check failed.");
}

export function compatibilityResult(issues: CompatibilityIssue[]): CompatibilityResult {
  if (issues.some((issue) => issue.severity === "error")) {
    return { status: "incompatible", issues };
  }

  if (issues.some((issue) => issue.severity === "warn")) {
    return { status: "warning", issues };
  }

  return { status: "compatible", issues };
}

function addMissingCapabilityIssues(issues: CompatibilityIssue[], requiredCapabilities: string[], runtimeContract: RuntimeContract) {
  if (requiredCapabilities.length === 0) {
    return;
  }

  const supported = getRequiredCapabilitySet(runtimeContract);
  const missing = requiredCapabilities.filter((capability) => !supported.has(capability));

  if (missing.length > 0) {
    issues.push({
      code: "required_capabilities_missing",
      severity: "error",
      message: "WorldSpec requires capabilities this runtime does not support.",
      details: { missing, requiredCapabilities },
    });
  }
}

function addUnsupportedUsedValues(issues: CompatibilityIssue[], capability: string, usedValues: string[], supportedValues: readonly string[]) {
  const uniqueUsed = [...new Set(usedValues)];
  const unsupported = uniqueUsed.filter((value) => !supportedValues.includes(value));

  if (unsupported.length === 0) {
    return;
  }

  issues.push({
    code: `${capability}_unsupported`,
    severity: "error",
    message: `WorldSpec uses unsupported ${capability} capabilities.`,
    details: { unsupported, supported: supportedValues },
  });
}

function collectActions(world: WorldSpec): ActionSpec[] {
  return [
    ...world.interactions.flatMap((interaction) => interaction.actions),
    ...world.quest.rules.flatMap((rule) => rule.actions),
  ];
}

function collectConditions(world: WorldSpec): ConditionSpec[] {
  return [
    ...world.interactions.flatMap((interaction) => interaction.conditions),
    ...world.quest.rules.flatMap((rule) => rule.conditions),
    ...world.quest.completionConditions,
  ];
}

export { SUPPORTED_EXPORT_FORMAT_VERSIONS, SUPPORTED_SPEC_VERSIONS };
