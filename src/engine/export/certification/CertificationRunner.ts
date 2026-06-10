import type { WorldSpec } from "../../quest/WorldSpec";
import type { BundleManifest } from "../BundleManifest";
import type { StaticExportFiles } from "../ExportBuilder";
import type { BrowserSmokeResult, ExportHealthCheck, ExportHealthReport } from "./ExportHealthReport";
import { overallStatus } from "./ExportHealthReport";
import type { CompatibilityResult } from "../../version/Compatibility";
import { ENGINE_VERSION, EXPORT_FORMAT_VERSION, RUNTIME_VERSION, SUPPORTED_EXPORT_FORMAT_VERSIONS, SUPPORTED_SPEC_VERSIONS } from "../../version/EngineVersion";
import { validateRuntimeContract } from "../../version/RuntimeContract";
import type { MigrationResult } from "../../version/migrations";
import { inspectNoApiCalls } from "./checks/inspectNoApiCalls";
import { inspectNoEditorImports } from "./checks/inspectNoEditorImports";
import { inspectNoExternalNetwork } from "./checks/inspectNoExternalNetwork";
import { byteLength, check, hashString } from "./checks/shared";
import { validateAssets } from "./checks/validateAssets";
import { validateBundleSize } from "./checks/validateBundleSize";
import { validateFileMode } from "./checks/validateFileMode";
import { validateManifest } from "./checks/validateManifest";
import { validateRuntimeCapabilities } from "./checks/validateRuntimeCapabilities";
import { validateStaticHosting } from "./checks/validateStaticHosting";
import { validateWorldSpec } from "./checks/validateWorldSpec";

const FIRST_RENDER_BUDGET_MS = 1500;

export interface CertificationInput {
  world: WorldSpec;
  files: StaticExportFiles;
  manifest: BundleManifest;
  buildId: string;
  createdAt: string;
  compatibility: CompatibilityResult;
  migration: MigrationResult;
  smokeResult?: BrowserSmokeResult;
}

export class CertificationRunner {
  static run(input: CertificationInput): ExportHealthReport {
    const checks: ExportHealthCheck[] = [
      validateWorldSpec(input.world),
      this.validateRuntimeCompatibility(input.compatibility),
      this.validateRuntimeContract(input.manifest),
      this.validateManifestVersion(input.manifest),
      this.validateSpecVersion(input.compatibility, input.world.specVersion),
      this.validateRequiredCapabilities(input.compatibility),
      this.validateMigration(input.migration),
      inspectNoEditorImports(input.files),
      inspectNoApiCalls(input.files),
      inspectNoExternalNetwork(input.files),
      validateAssets(input.world, input.files),
      validateManifest(input.manifest),
      validateFileMode(input.files),
      validateStaticHosting(input.files),
      validateRuntimeCapabilities(input.files),
      this.validateMobileViewport(input.files),
      this.validateFirstRender(input.smokeResult),
      validateBundleSize(input.files),
      this.validateConsoleErrors(input.smokeResult),
      this.validateInteractionSmoke(input.world, input.smokeResult),
    ];

    const artifacts = this.artifacts(input.files);
    const assetBytes = input.world.assets.reduce((sum, asset) => {
      if (asset.uri.startsWith("data:")) {
        return sum + byteLength(asset.uri);
      }
      return sum;
    }, 0);
    const bundleBytes = artifacts.files.reduce((sum, file) => sum + file.bytes, 0);

    return {
      id: `ehr-${input.buildId}`,
      createdAt: input.createdAt,
      overallStatus: overallStatus(checks),
      buildId: input.buildId,
      engineVersion: ENGINE_VERSION,
      runtimeVersion: RUNTIME_VERSION,
      specVersion: input.world.specVersion,
      exportFormatVersion: EXPORT_FORMAT_VERSION,
      compatibility: input.compatibility,
      migrationsApplied: input.migration.appliedMigrations,
      migrationWarnings: input.migration.warnings,
      checks,
      metrics: {
        bundleBytes,
        assetBytes,
        totalBytes: bundleBytes + assetBytes,
        estimatedFirstRenderMs: input.smokeResult?.firstRenderMs,
        entityCount: input.world.entities.length,
        interactionCount: input.world.interactions.length,
        assetCount: input.world.assets.length,
      },
      artifacts,
    };
  }

  private static validateRuntimeCompatibility(compatibility: CompatibilityResult): ExportHealthCheck {
    if (compatibility.status === "compatible") {
      return check("runtime_version_compatible", "Runtime version compatible", "pass", "WorldSpec is compatible with the bundled runtime contract.");
    }

    if (compatibility.status === "warning") {
      return check(
        "runtime_version_compatible",
        "Runtime version compatible",
        "warn",
        "WorldSpec is compatible, but compatibility warnings were found.",
        compatibility.issues,
      );
    }

    return check(
      "runtime_version_compatible",
      "Runtime version compatible",
      "fail",
      "WorldSpec is incompatible with the bundled runtime contract.",
      compatibility.issues,
    );
  }

  private static validateRuntimeContract(manifest: BundleManifest): ExportHealthCheck {
    const result = validateRuntimeContract(manifest.contract);
    if (result.success) {
      return check("runtime_contract_valid", "Runtime contract valid", "pass", "Manifest includes a valid runtime contract.");
    }

    return check(
      "runtime_contract_valid",
      "Runtime contract valid",
      "fail",
      "Manifest runtime contract is invalid.",
      result.error.issues.map((issue) => ({ path: issue.path.join(".") || "(root)", message: issue.message })),
    );
  }

  private static validateManifestVersion(manifest: BundleManifest): ExportHealthCheck {
    const valid =
      manifest.engineVersion === ENGINE_VERSION &&
      manifest.runtimeVersion === RUNTIME_VERSION &&
      manifest.exportFormatVersion === EXPORT_FORMAT_VERSION &&
      (SUPPORTED_EXPORT_FORMAT_VERSIONS as readonly string[]).includes(manifest.exportFormatVersion);

    if (valid) {
      return check("manifest_version_valid", "Manifest versions valid", "pass", "Manifest versions match the current exporter contract.");
    }

    return check("manifest_version_valid", "Manifest versions valid", "fail", "Manifest version metadata does not match this exporter.", {
      manifest: {
        engineVersion: manifest.engineVersion,
        runtimeVersion: manifest.runtimeVersion,
        specVersion: manifest.specVersion,
        exportFormatVersion: manifest.exportFormatVersion,
      },
      expected: { ENGINE_VERSION, RUNTIME_VERSION, EXPORT_FORMAT_VERSION },
    });
  }

  private static validateSpecVersion(compatibility: CompatibilityResult, specVersion: string): ExportHealthCheck {
    const unsupported = compatibility.issues.filter((issue) => issue.code.includes("spec_version"));
    if (unsupported.length === 0 && (SUPPORTED_SPEC_VERSIONS as readonly string[]).includes(specVersion)) {
      return check("spec_version_supported", "Spec version supported", "pass", "WorldSpec version is explicitly supported.");
    }

    return check("spec_version_supported", "Spec version supported", "fail", "WorldSpec version is not supported by this runtime.", {
      specVersion,
      supportedSpecVersions: SUPPORTED_SPEC_VERSIONS,
      issues: unsupported,
    });
  }

  private static validateRequiredCapabilities(compatibility: CompatibilityResult): ExportHealthCheck {
    const capabilityIssues = compatibility.issues.filter(
      (issue) => issue.code === "required_capabilities_missing" || issue.code.endsWith("_unsupported"),
    );

    if (capabilityIssues.length === 0) {
      return check("required_capabilities_supported", "Required capabilities supported", "pass", "Runtime supports required and used spec capabilities.");
    }

    return check(
      "required_capabilities_supported",
      "Required capabilities supported",
      "fail",
      "Runtime is missing capabilities required by this spec.",
      capabilityIssues,
    );
  }

  private static validateMigration(migration: MigrationResult): ExportHealthCheck {
    if (migration.appliedMigrations.length > 0 || migration.warnings.length > 0) {
      return check("migration_status", "Migration status", "warn", "WorldSpec was migrated or stamped before export.", {
        fromVersion: migration.fromVersion,
        toVersion: migration.toVersion,
        appliedMigrations: migration.appliedMigrations,
        warnings: migration.warnings,
      });
    }

    return check(
      "migration_status",
      "Migration status",
      "pass",
      "WorldSpec already uses the current spec contract; no migration was required.",
      { version: migration.toVersion },
    );
  }

  private static validateMobileViewport(files: StaticExportFiles): ExportHealthCheck {
    const html = `${files["index.html"] ?? ""}\n${files["single.html"] ?? ""}`;
    const hasViewport = html.includes('name="viewport"') && html.includes("width=device-width");
    const canvasResponsive = html.includes("canvas { width: 100%; height: 100%;");

    if (hasViewport && canvasResponsive) {
      return check("mobile_viewport_ready", "Mobile viewport ready", "pass", "Export includes responsive viewport metadata and scalable canvas sizing.");
    }

    return check(
      "mobile_viewport_ready",
      "Mobile viewport ready",
      "warn",
      "Export may not scale cleanly on mobile screens. Check viewport meta and canvas CSS.",
      { hasViewport, canvasResponsive },
    );
  }

  private static validateFirstRender(smokeResult?: BrowserSmokeResult): ExportHealthCheck {
    if (!smokeResult?.available) {
      return check(
        "first_render_budget",
        "First render budget",
        "warn",
        "Browser smoke test was not run, so first render timing could not be verified.",
      );
    }

    if (!smokeResult.ready || smokeResult.firstRenderMs === undefined) {
      return check("first_render_budget", "First render budget", "fail", "Runtime did not report a first render marker.");
    }

    if (smokeResult.firstRenderMs > FIRST_RENDER_BUDGET_MS) {
      return check(
        "first_render_budget",
        "First render budget",
        "warn",
        `First render took ${Math.round(smokeResult.firstRenderMs)}ms, above the ${FIRST_RENDER_BUDGET_MS}ms target.`,
        { firstRenderMs: smokeResult.firstRenderMs, budgetMs: FIRST_RENDER_BUDGET_MS },
      );
    }

    return check(
      "first_render_budget",
      "First render budget",
      "pass",
      `First render completed in ${Math.round(smokeResult.firstRenderMs)}ms.`,
      { firstRenderMs: smokeResult.firstRenderMs, budgetMs: FIRST_RENDER_BUDGET_MS },
    );
  }

  private static validateConsoleErrors(smokeResult?: BrowserSmokeResult): ExportHealthCheck {
    if (!smokeResult?.available) {
      return check("no_console_errors", "No console errors", "warn", "Browser smoke test was not run, so console errors could not be verified.");
    }

    if (smokeResult.errors.length > 0) {
      return check("no_console_errors", "No console errors", "fail", "Runtime reported errors during initial load.", smokeResult.errors);
    }

    return check("no_console_errors", "No console errors", "pass", "Runtime reported no errors during initial load.");
  }

  private static validateInteractionSmoke(world: WorldSpec, smokeResult?: BrowserSmokeResult): ExportHealthCheck {
    const clickInteractions = world.interactions.filter((interaction) => interaction.trigger === "click");

    if (clickInteractions.length === 0) {
      return check("interaction_smoke_test", "Interaction smoke test", "warn", "Quest has no click interactions to smoke test.");
    }

    if (!smokeResult?.available) {
      return check("interaction_smoke_test", "Interaction smoke test", "warn", "Browser smoke test was not run, so interaction behavior was not verified.");
    }

    if (smokeResult.interactionChanged) {
      return check("interaction_smoke_test", "Interaction smoke test", "pass", smokeResult.interactionMessage, {
        events: smokeResult.events,
      });
    }

    return check("interaction_smoke_test", "Interaction smoke test", "fail", smokeResult.interactionMessage, {
      events: smokeResult.events,
      errors: smokeResult.errors,
    });
  }

  private static artifacts(files: StaticExportFiles): ExportHealthReport["artifacts"] {
    const fileList = Object.entries(files).map(([path, content]) => ({
      path,
      bytes: byteLength(content),
      hash: hashString(content),
    }));

    return {
      hasSingleHtml: Boolean(files["single.html"]),
      hasZip: true,
      files: fileList,
    };
  }
}
