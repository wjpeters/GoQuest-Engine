import { ENGINE_VERSION, RUNTIME_VERSION, SPEC_VERSION } from "../EngineVersion";
import type { MigrationFn, RegisteredMigration } from "./types";

const migrations: RegisteredMigration[] = [];

export function registerMigration(fromVersion: string, toVersion: string, fn: MigrationFn) {
  const exists = migrations.some((migration) => migration.fromVersion === fromVersion && migration.toVersion === toVersion);
  if (!exists) {
    migrations.push({ fromVersion, toVersion, fn });
  }
}

export function getRegisteredMigrations() {
  return [...migrations];
}

export function findMigration(fromVersion: string, toVersion: string) {
  return migrations.find((migration) => migration.fromVersion === fromVersion && migration.toVersion === toVersion);
}

registerMigration("1.0.0", "1.0.0", (spec) => ({
  ...spec,
  specVersion: SPEC_VERSION,
  requiredRuntimeVersion: typeof spec.requiredRuntimeVersion === "string" ? spec.requiredRuntimeVersion : RUNTIME_VERSION,
  createdWithEngineVersion: typeof spec.createdWithEngineVersion === "string" ? spec.createdWithEngineVersion : ENGINE_VERSION,
  lastEditedWithEngineVersion: ENGINE_VERSION,
}));

registerMigration("0.0.0", "1.0.0", (spec) => ({
  ...spec,
  specVersion: SPEC_VERSION,
  requiredRuntimeVersion: typeof spec.requiredRuntimeVersion === "string" ? spec.requiredRuntimeVersion : RUNTIME_VERSION,
  createdWithEngineVersion: typeof spec.createdWithEngineVersion === "string" ? spec.createdWithEngineVersion : ENGINE_VERSION,
  lastEditedWithEngineVersion: ENGINE_VERSION,
}));

// Future pattern:
// registerMigration("1.0.0", "1.1.0", (spec) => ({
//   ...spec,
//   specVersion: "1.1.0",
//   requiredCapabilities: [...new Set([...(Array.isArray(spec.requiredCapabilities) ? spec.requiredCapabilities : []), "action:newAction"])],
// }));
