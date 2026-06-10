import type { WorldSpec } from "../../quest/WorldSpec";
import type { BundleManifest } from "../BundleManifest";
import type { StaticExportFiles } from "../ExportBuilder";
import type { BrowserSmokeResult, ExportHealthCheck, ExportHealthReport } from "./ExportHealthReport";
import { overallStatus } from "./ExportHealthReport";
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

export const RUNTIME_VERSION = "0.1.0";
const SUPPORTED_SPEC_VERSIONS = ["0.1.0"];
const FIRST_RENDER_BUDGET_MS = 1500;

export interface CertificationInput {
  world: WorldSpec;
  files: StaticExportFiles;
  manifest: BundleManifest;
  buildId: string;
  createdAt: string;
  smokeResult?: BrowserSmokeResult;
}

export class CertificationRunner {
  static run(input: CertificationInput): ExportHealthReport {
    const checks: ExportHealthCheck[] = [
      validateWorldSpec(input.world),
      this.validateRuntimeVersion(input.world.version),
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
      runtimeVersion: RUNTIME_VERSION,
      specVersion: input.world.version,
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

  private static validateRuntimeVersion(specVersion: string): ExportHealthCheck {
    if (SUPPORTED_SPEC_VERSIONS.includes(specVersion)) {
      return check("runtime_version_compatible", "Runtime version compatible", "pass", "WorldSpec version is supported by this runtime.");
    }

    const [runtimeMajor] = RUNTIME_VERSION.split(".");
    const [specMajor] = specVersion.split(".");
    if (runtimeMajor === specMajor) {
      return check(
        "runtime_version_compatible",
        "Runtime version compatible",
        "warn",
        "WorldSpec version is not explicitly certified for this runtime. Migration may be needed.",
        { runtimeVersion: RUNTIME_VERSION, specVersion, supportedSpecVersions: SUPPORTED_SPEC_VERSIONS },
      );
    }

    return check(
      "runtime_version_compatible",
      "Runtime version compatible",
      "fail",
      "WorldSpec version is incompatible with this runtime.",
      { runtimeVersion: RUNTIME_VERSION, specVersion, supportedSpecVersions: SUPPORTED_SPEC_VERSIONS },
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
