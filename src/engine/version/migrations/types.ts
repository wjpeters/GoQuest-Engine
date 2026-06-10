import type { WorldSpec } from "../../quest/WorldSpec";

export type MigrationContext = {
  fromVersion: string;
  toVersion: string;
};

export type MigrationFn = (spec: Record<string, unknown>, context: MigrationContext) => Record<string, unknown>;

export type RegisteredMigration = {
  fromVersion: string;
  toVersion: string;
  fn: MigrationFn;
};

export type MigrationResult = {
  migratedSpec: WorldSpec;
  fromVersion: string;
  toVersion: string;
  appliedMigrations: string[];
  warnings: string[];
};
