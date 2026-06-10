import { expect, test } from "@playwright/test";
import { ExportManifestSchema } from "../src/engine/export/BundleManifest";
import { ExportBuilder } from "../src/engine/export/ExportBuilder";
import type { WorldSpec } from "../src/engine/quest/WorldSpec";
import { checkRuntimeCompatibility } from "../src/engine/version/Compatibility";
import { ENGINE_NAME, ENGINE_VERSION, EXPORT_FORMAT_VERSION, RUNTIME_VERSION, SPEC_VERSION } from "../src/engine/version/EngineVersion";
import { CURRENT_RUNTIME_CONTRACT, RuntimeContractSchema } from "../src/engine/version/RuntimeContract";
import { migrateWorldSpec } from "../src/engine/version/migrations";
import { templates } from "../src/templates";
import { CyberRiskRoom } from "../src/templates/CyberRiskRoom";

test("runtime contract validates", () => {
  expect(RuntimeContractSchema.safeParse(CURRENT_RUNTIME_CONTRACT).success).toBe(true);
  expect(CURRENT_RUNTIME_CONTRACT.engine).toBe(ENGINE_NAME);
  expect(CURRENT_RUNTIME_CONTRACT.runtimeVersion).toBe(RUNTIME_VERSION);
  expect(CURRENT_RUNTIME_CONTRACT.supportedSpecVersions).toContain(SPEC_VERSION);
  expect(CURRENT_RUNTIME_CONTRACT.supportedExportFormatVersions).toContain(EXPORT_FORMAT_VERSION);
});

test("current templates declare the active spec contract", () => {
  for (const template of templates) {
    expect(template.specVersion).toBe(SPEC_VERSION);
    expect(template.quest.specVersion).toBe(SPEC_VERSION);
    expect(template.requiredRuntimeVersion).toBe(RUNTIME_VERSION);
  }
});

test("compatibility passes for all current templates", () => {
  for (const template of templates) {
    const result = checkRuntimeCompatibility(template, CURRENT_RUNTIME_CONTRACT);
    expect(result.status).toBe("compatible");
    expect(result.issues).toEqual([]);
  }
});

test("unsupported spec version is incompatible", () => {
  const futureSpec = structuredClone(CyberRiskRoom);
  futureSpec.specVersion = "99.0.0";

  const result = checkRuntimeCompatibility(futureSpec, CURRENT_RUNTIME_CONTRACT);

  expect(result.status).toBe("incompatible");
  expect(result.issues.map((issue) => issue.code)).toContain("spec_version_unsupported");
});

test("missing required capability fails compatibility", () => {
  const unsupportedCapability = structuredClone(CyberRiskRoom);
  unsupportedCapability.requiredCapabilities = ["renderer:webgl2", "action:teleportPlayer"];

  const result = checkRuntimeCompatibility(unsupportedCapability, CURRENT_RUNTIME_CONTRACT);

  expect(result.status).toBe("incompatible");
  expect(result.issues.map((issue) => issue.code)).toContain("required_capabilities_missing");
});

test("identity migration keeps current specs on the latest version", () => {
  const result = migrateWorldSpec(CyberRiskRoom);

  expect(result.fromVersion).toBe(SPEC_VERSION);
  expect(result.toVersion).toBe(SPEC_VERSION);
  expect(result.appliedMigrations).toEqual([]);
  expect(result.migratedSpec.specVersion).toBe(SPEC_VERSION);
});

test("legacy specs without specVersion migrate deterministically", () => {
  const legacySpec = structuredClone(CyberRiskRoom) as Partial<WorldSpec> & { quest: Partial<WorldSpec["quest"]> };
  delete legacySpec.specVersion;
  delete legacySpec.quest.specVersion;

  const result = migrateWorldSpec(legacySpec);

  expect(result.fromVersion).toBe("0.0.0");
  expect(result.toVersion).toBe(SPEC_VERSION);
  expect(result.appliedMigrations).toEqual(["0.0.0->1.0.0"]);
  expect(result.warnings.length).toBeGreaterThan(0);
  expect(result.migratedSpec.specVersion).toBe(SPEC_VERSION);
  expect(result.migratedSpec.quest.specVersion).toBe(SPEC_VERSION);
});

test("ExportBuilder stamps manifest with central version constants and contract", async () => {
  const certified = await ExportBuilder.buildCertified(CyberRiskRoom);
  const manifest = certified.package.manifest;

  expect(manifest.engine).toBe(ENGINE_NAME);
  expect(manifest.engineVersion).toBe(ENGINE_VERSION);
  expect(manifest.runtimeVersion).toBe(RUNTIME_VERSION);
  expect(manifest.specVersion).toBe(SPEC_VERSION);
  expect(manifest.exportFormatVersion).toBe(EXPORT_FORMAT_VERSION);
  expect(manifest.contract).toEqual(CURRENT_RUNTIME_CONTRACT);
  expect(manifest.compatibility.status).toBe("compatible");
  expect(ExportManifestSchema.safeParse(manifest).success).toBe(true);
});

test("ExportBuilder includes compatibility and migration status in health report", async () => {
  const certified = await ExportBuilder.buildCertified(CyberRiskRoom);

  expect(certified.healthReport.runtimeVersion).toBe(RUNTIME_VERSION);
  expect(certified.healthReport.specVersion).toBe(SPEC_VERSION);
  expect(certified.healthReport.exportFormatVersion).toBe(EXPORT_FORMAT_VERSION);
  expect(certified.healthReport.compatibility.status).toBe("compatible");
  expect(certified.healthReport.migrationsApplied).toEqual([]);
  expect(certified.healthReport.checks.map((check) => check.id)).toEqual(
    expect.arrayContaining([
      "runtime_contract_valid",
      "manifest_version_valid",
      "spec_version_supported",
      "required_capabilities_supported",
      "migration_status",
    ]),
  );
});

test("ExportBuilder blocks unsupported spec versions through certification", async () => {
  const futureSpec = structuredClone(CyberRiskRoom);
  futureSpec.specVersion = "99.0.0";
  futureSpec.quest.specVersion = "99.0.0";

  const certified = await ExportBuilder.buildCertified(futureSpec);

  expect(certified.canDownload).toBe(false);
  expect(certified.healthReport.overallStatus).toBe("fail");
  expect(certified.healthReport.compatibility.status).toBe("incompatible");
  expect(certified.healthReport.checks.find((check) => check.id === "spec_version_supported")?.status).toBe("fail");
});
