import { ENGINE_VERSION, RUNTIME_VERSION, SPEC_VERSION } from "../EngineVersion";
import { WorldSpecSchema } from "../../quest/WorldSpec";
import { findMigration } from "./migrations";
import type { MigrationResult } from "./types";

export function getLatestSpecVersion() {
  return SPEC_VERSION;
}

export function needsMigration(spec: unknown, targetVersion = SPEC_VERSION) {
  return detectSpecVersion(spec) !== targetVersion;
}

export function migrateWorldSpec(spec: unknown, targetVersion = SPEC_VERSION): MigrationResult {
  const fromVersion = detectSpecVersion(spec);
  const warnings: string[] = [];
  const appliedMigrations: string[] = [];
  let workingSpec = cloneSpecRecord(spec);
  let currentVersion = fromVersion;

  if (fromVersion === "0.0.0") {
    warnings.push("Legacy WorldSpec has no specVersion; it was stamped as 1.0.0 for export compatibility.");
  }

  if (currentVersion !== targetVersion) {
    const migration = findMigration(currentVersion, targetVersion);
    if (!migration) {
      warnings.push(`No WorldSpec migration registered from ${currentVersion} to ${targetVersion}; compatibility checks must block export if unsupported.`);
      const migratedSpec = WorldSpecSchema.parse(stampCurrentVersionFields(workingSpec, currentVersion));
      return {
        migratedSpec,
        fromVersion,
        toVersion: migratedSpec.specVersion,
        appliedMigrations,
        warnings,
      };
    }

    workingSpec = migration.fn(workingSpec, { fromVersion: currentVersion, toVersion: targetVersion });
    appliedMigrations.push(`${currentVersion}->${targetVersion}`);
    currentVersion = targetVersion;
  }

  workingSpec = stampCurrentVersionFields(workingSpec, targetVersion);
  const migratedSpec = WorldSpecSchema.parse(workingSpec);

  return {
    migratedSpec,
    fromVersion,
    toVersion: migratedSpec.specVersion,
    appliedMigrations,
    warnings,
  };
}

function detectSpecVersion(spec: unknown) {
  if (isRecord(spec) && typeof spec.specVersion === "string" && spec.specVersion.trim().length > 0) {
    return spec.specVersion;
  }

  return "0.0.0";
}

function cloneSpecRecord(spec: unknown): Record<string, unknown> {
  if (!isRecord(spec)) {
    throw new Error("WorldSpec migration expects an object.");
  }

  return JSON.parse(JSON.stringify(spec)) as Record<string, unknown>;
}

function stampCurrentVersionFields(spec: Record<string, unknown>, specVersion: string) {
  const quest = isRecord(spec.quest) ? spec.quest : {};

  return {
    ...spec,
    specVersion,
    requiredRuntimeVersion: typeof spec.requiredRuntimeVersion === "string" ? spec.requiredRuntimeVersion : RUNTIME_VERSION,
    createdWithEngineVersion: typeof spec.createdWithEngineVersion === "string" ? spec.createdWithEngineVersion : ENGINE_VERSION,
    lastEditedWithEngineVersion: ENGINE_VERSION,
    quest: {
      ...quest,
      specVersion: typeof quest.specVersion === "string" ? quest.specVersion : specVersion,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
