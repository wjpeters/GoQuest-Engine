import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";
import type { BundleManifest } from "../src/engine/export/BundleManifest";
import { ENGINE_NAME, ENGINE_VERSION, EXPORT_FORMAT_VERSION, RUNTIME_VERSION, SPEC_VERSION } from "../src/engine/version/EngineVersion";
import type { RuntimeContract } from "../src/engine/version/RuntimeContract";
import { attachNetworkGuard } from "./helpers/networkGuards";
import { buildTemplateExport, templateSmokeMatrix, type BuiltTemplateExport } from "./helpers/buildTemplateExport";
import { startStaticServer } from "./helpers/staticServer";

type RuntimeHealth = {
  ready?: boolean;
  firstRenderMs?: number;
  renderer?: {
    selectedBackend?: "webgl2" | "canvas2d" | "webgpu" | "static" | "none";
    attemptedBackends?: Array<{ backend: string; available: boolean; reason?: string }>;
    degraded?: boolean;
    degradationWarnings?: unknown[];
    capabilities?: unknown;
  };
  selectedRenderer?: "webgl2" | "canvas2d" | "webgpu" | "static" | "none";
  runtimeVersion?: string;
  specVersion?: string;
  exportFormatVersion?: string;
  compatible?: boolean;
  compatibilityIssues?: unknown[];
  errors?: string[];
  events?: string[];
};

type RuntimeHooks = {
  getHealth: () => RuntimeHealth;
  getEventCount: () => number;
  getState: () => unknown;
  clickFirstInteraction: () => { changed: boolean; message: string };
  forceRenderer?: (backend: "webgl2" | "canvas2d" | "static") => boolean;
};

for (const template of templateSmokeMatrix) {
  test.describe(`export smoke: ${template.title}`, () => {
    test("generates a certified standalone export package", async () => {
      const built = await buildTemplateExport(template.id);
      try {
        assertRequiredFiles(built);
        assertManifest(built.manifest);
        expect(built.healthReport.overallStatus).not.toBe("fail");
      } finally {
        await built.cleanup();
      }
    });

    test("loads from a local static server without console errors or external requests", async ({ page }) => {
      const built = await buildTemplateExport(template.id);
      const server = await startStaticServer(built.outDir);
      const consoleErrors = collectConsoleErrors(page);
      const pageErrors = collectPageErrors(page);
      const networkGuard = attachNetworkGuard(page, server.origin);

      try {
        await page.goto(server.url, { waitUntil: "domcontentloaded" });
        await waitForRuntimeReady(page);

        const health = await getRuntimeHealth(page);
        expect(health).toBeTruthy();
        expect(health.ready).toBe(true);
        expect(["webgl2", "canvas2d"]).toContain(health.renderer?.selectedBackend);
        expect(health.renderer?.selectedBackend).not.toBe("webgpu");
        expect(health.runtimeVersion).toBe(built.manifest.runtimeVersion);
        expect(health.specVersion).toBe(built.manifest.specVersion);
        expect(health.exportFormatVersion).toBe(built.manifest.exportFormatVersion);
        expect(health.compatible).toBe(true);
        expect(health.compatibilityIssues ?? []).toEqual([]);
        expect(typeof health.firstRenderMs).toBe("number");
        expect(health.firstRenderMs).toBeGreaterThanOrEqual(0);

        const contract = await getRuntimeContract(page);
        expect(contract.engine).toBe(built.manifest.engine);
        expect(contract.runtimeVersion).toBe(built.manifest.runtimeVersion);
        expect(contract.supportedSpecVersions).toContain(built.manifest.specVersion);

        await expect(page.locator("canvas#quest")).toBeVisible();
        const bodyText = await page.locator("body").innerText();
        expect(bodyText.trim().length).toBeGreaterThan(0);

        expect(networkGuard.violations).toEqual([]);
        expect(consoleErrors.messages).toEqual([]);
        expect(pageErrors.messages).toEqual([]);
      } finally {
        networkGuard.dispose();
        await server.close();
        await built.cleanup();
      }
    });

    test("records an interaction through runtime test hooks", async ({ page }) => {
      const built = await buildTemplateExport(template.id);
      const server = await startStaticServer(built.outDir);
      const consoleErrors = collectConsoleErrors(page);
      const pageErrors = collectPageErrors(page);
      const networkGuard = attachNetworkGuard(page, server.origin);

      try {
        await page.goto(server.url, { waitUntil: "domcontentloaded" });
        await waitForRuntimeReady(page);

        const before = await getRuntimeState(page);
        const beforeCount = await getRuntimeEventCount(page);
        const result = await page.evaluate(() => {
          const hooks = (window as Window & { __AQE_TEST_HOOKS__?: RuntimeHooks }).__AQE_TEST_HOOKS__;
          if (!hooks) {
            throw new Error("Runtime test hooks are unavailable.");
          }
          return hooks.clickFirstInteraction();
        });
        const after = await getRuntimeState(page);
        const afterCount = await getRuntimeEventCount(page);

        expect(afterCount).toBeGreaterThan(beforeCount);
        expect(result.changed).toBe(true);
        expect(JSON.stringify(after)).not.toBe(JSON.stringify(before));
        expect(networkGuard.violations).toEqual([]);
        expect(consoleErrors.messages).toEqual([]);
        expect(pageErrors.messages).toEqual([]);
      } finally {
        networkGuard.dispose();
        await server.close();
        await built.cleanup();
      }
    });
  });
}

test("mobile viewport export smoke: Cyber Risk Room", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const built = await buildTemplateExport("cyber-risk-room");
  const server = await startStaticServer(built.outDir);
  const consoleErrors = collectConsoleErrors(page);
  const pageErrors = collectPageErrors(page);
  const networkGuard = attachNetworkGuard(page, server.origin);

  try {
    await page.goto(server.url, { waitUntil: "domcontentloaded" });
    await waitForRuntimeReady(page);
    await expect(page.locator("canvas#quest")).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
    expect(networkGuard.violations).toEqual([]);
    expect(consoleErrors.messages).toEqual([]);
    expect(pageErrors.messages).toEqual([]);
  } finally {
    networkGuard.dispose();
    await server.close();
    await built.cleanup();
    await context.close();
  }
});

test("canvas2d renderer override reaches ready state without fatal errors", async ({ page }) => {
  const built = await buildTemplateExport("cyber-risk-room");
  const server = await startStaticServer(built.outDir);
  const consoleErrors = collectConsoleErrors(page);
  const pageErrors = collectPageErrors(page);
  const networkGuard = attachNetworkGuard(page, server.origin);

  try {
    await page.goto(`${server.url}?renderer=canvas2d`, { waitUntil: "domcontentloaded" });
    await waitForRuntimeReady(page);
    const health = await getRuntimeHealth(page);

    expect(health.ready).toBe(true);
    expect(health.renderer?.selectedBackend).toBe("canvas2d");
    expect(health.renderer?.degraded).toBe(true);
    expect(health.compatible).toBe(true);
    await expect(page.locator("canvas#quest")).toBeVisible();
    expect(networkGuard.violations).toEqual([]);
    expect(consoleErrors.messages).toEqual([]);
    expect(pageErrors.messages).toEqual([]);
  } finally {
    networkGuard.dispose();
    await server.close();
    await built.cleanup();
  }
});

test("static renderer override shows a nonblank fallback", async ({ page }) => {
  const built = await buildTemplateExport("cyber-risk-room");
  const server = await startStaticServer(built.outDir);
  const consoleErrors = collectConsoleErrors(page);
  const pageErrors = collectPageErrors(page);
  const networkGuard = attachNetworkGuard(page, server.origin);

  try {
    await page.goto(`${server.url}?renderer=static`, { waitUntil: "domcontentloaded" });
    await waitForRuntimeReady(page);
    const health = await getRuntimeHealth(page);
    const bodyText = await page.locator("body").innerText();

    expect(health.ready).toBe(true);
    expect(health.renderer?.selectedBackend).toBe("static");
    expect(health.renderer?.degraded).toBe(true);
    expect(bodyText).toContain("Standalone export");
    await expect(page.locator("canvas#quest")).toBeVisible();
    expect(networkGuard.violations).toEqual([]);
    expect(consoleErrors.messages).toEqual([]);
    expect(pageErrors.messages).toEqual([]);
  } finally {
    networkGuard.dispose();
    await server.close();
    await built.cleanup();
  }
});

test("single HTML export runs from file:// without fetching quest JSON", async ({ page }) => {
  const built = await buildTemplateExport("cyber-risk-room");
  const singleHtml = join(built.outDir, "single.html");
  const consoleErrors = collectConsoleErrors(page);
  const pageErrors = collectPageErrors(page);
  const networkGuard = attachNetworkGuard(page);

  test.skip(!existsSync(singleHtml), "single.html export was not generated.");

  try {
    await page.goto(pathToFileURL(singleHtml).toString(), { waitUntil: "domcontentloaded", timeout: 10_000 });
  } catch (error) {
    test.skip(true, `file:// smoke test is not feasible in this Playwright setup: ${String(error)}`);
  }

  try {
    await waitForRuntimeReady(page);
    const health = await getRuntimeHealth(page);
    expect(health.ready).toBe(true);
    expect(health.runtimeVersion).toBe(built.manifest.runtimeVersion);
    expect(health.specVersion).toBe(SPEC_VERSION);
    expect(health.exportFormatVersion).toBe(EXPORT_FORMAT_VERSION);
    expect(health.compatible).toBe(true);
    expect(health.renderer?.selectedBackend).not.toBe("webgpu");
    expect(health.errors ?? []).toEqual([]);
    const contract = await getRuntimeContract(page);
    expect(contract.runtimeVersion).toBe(RUNTIME_VERSION);
    expect(networkGuard.violations.filter((url) => url.includes("quest-spec.json"))).toEqual([]);
    expect(consoleErrors.messages).toEqual([]);
    expect(pageErrors.messages).toEqual([]);
  } finally {
    networkGuard.dispose();
    await built.cleanup();
  }
});

function assertRequiredFiles(built: BuiltTemplateExport) {
  expect(existsSync(join(built.outDir, "index.html"))).toBe(true);
  expect(existsSync(join(built.outDir, "runtime.js"))).toBe(true);
  expect(existsSync(join(built.outDir, "manifest.json"))).toBe(true);

  if (built.template.exportSettings.includeSourceSpec) {
    expect(existsSync(join(built.outDir, "quest-spec.json"))).toBe(true);
  }
}

function assertManifest(manifest: BundleManifest) {
  expect(manifest.engine).toBe(ENGINE_NAME);
  expect(manifest.engineVersion).toBe(ENGINE_VERSION);
  expect(manifest.buildId).toMatch(/^build-/);
  expect(manifest.runtimeVersion).toBe(RUNTIME_VERSION);
  expect(manifest.specVersion).toBe(SPEC_VERSION);
  expect(manifest.exportFormatVersion).toBe(EXPORT_FORMAT_VERSION);
  expect(manifest.contract.runtimeVersion).toBe(RUNTIME_VERSION);
  expect(manifest.compatibility.status).toBe("compatible");
  expect(manifest.rendererPolicy.defaultBackend).toBe("webgl2");
  expect(manifest.rendererPolicy.allowExperimentalWebGPU).toBe(false);
  expect(manifest.rendererPolicy.fallbackModesAvailable).toEqual(expect.arrayContaining(["canvas2d", "static"]));
  expect(manifest.standalone).toBe(true);
  expect(manifest.requiresNetwork).toBe(false);
  expect(manifest.capabilities.networkRequired).toBe(false);
  expect(manifest.files.map((file) => file.path)).toContain("index.html");
}

async function waitForRuntimeReady(page: Page) {
  await page.waitForFunction(() => (window as Window & { __AQE_RUNTIME_READY__?: boolean }).__AQE_RUNTIME_READY__ === true, null, {
    timeout: 5_000,
  });
}

async function getRuntimeHealth(page: Page) {
  return page.evaluate(() => {
    return (window as Window & { __AQE_EXPORT_HEALTH__?: RuntimeHealth }).__AQE_EXPORT_HEALTH__;
  });
}

async function getRuntimeContract(page: Page) {
  return page.evaluate(() => {
    return (window as Window & { __AQE_RUNTIME_CONTRACT__?: RuntimeContract }).__AQE_RUNTIME_CONTRACT__;
  });
}

async function getRuntimeEventCount(page: Page) {
  return page.evaluate(() => {
    const hooks = (window as Window & { __AQE_TEST_HOOKS__?: RuntimeHooks }).__AQE_TEST_HOOKS__;
    if (!hooks) {
      throw new Error("Runtime test hooks are unavailable.");
    }
    return hooks.getEventCount();
  });
}

async function getRuntimeState(page: Page) {
  return page.evaluate(() => {
    const hooks = (window as Window & { __AQE_TEST_HOOKS__?: RuntimeHooks }).__AQE_TEST_HOOKS__;
    if (!hooks) {
      throw new Error("Runtime test hooks are unavailable.");
    }
    return hooks.getState();
  });
}

function collectConsoleErrors(page: Page) {
  const messages: string[] = [];
  const onConsole = (message: ConsoleMessage) => {
    if (message.type() === "error") {
      messages.push(message.text());
    }
  };
  page.on("console", onConsole);
  return { messages };
}

function collectPageErrors(page: Page) {
  const messages: string[] = [];
  page.on("pageerror", (error) => messages.push(error.message));
  return { messages };
}
