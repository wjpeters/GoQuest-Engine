import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clipboard, Download, FileArchive, Loader2, ShieldCheck, X, XCircle } from "lucide-react";
import { ExportBuilder } from "../../engine/export/ExportBuilder";
import type { BrowserSmokeResult, CertifiedExportResult, ExportHealthCheck, ExportHealthStatus } from "../../engine/export/certification/ExportHealthReport";
import type { WorldSpec } from "../../engine/quest/WorldSpec";

interface ExportDialogProps {
  world: WorldSpec;
  onClose: () => void;
}

const checkGroups: Array<{ title: string; ids: string[] }> = [
  {
    title: "Version contract",
    ids: [
      "worldspec_schema_valid",
      "runtime_version_compatible",
      "runtime_contract_valid",
      "manifest_version_valid",
      "spec_version_supported",
      "required_capabilities_supported",
      "migration_status",
    ],
  },
  { title: "Runtime independence", ids: ["no_editor_imports", "no_api_calls", "no_external_network_requests", "works_without_webgpu"] },
  { title: "Assets", ids: ["assets_present"] },
  { title: "Portability", ids: ["manifest_valid", "loads_from_file_possible", "loads_from_static_server", "mobile_viewport_ready"] },
  { title: "Performance", ids: ["first_render_budget", "bundle_size_budget"] },
  { title: "Smoke test", ids: ["no_console_errors", "interaction_smoke_test"] },
];

export function ExportDialog({ world, onClose }: ExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isCertifying, setIsCertifying] = useState(true);
  const [certified, setCertified] = useState<CertifiedExportResult>();
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  useEffect(() => {
    let cancelled = false;

    async function certify() {
      setIsCertifying(true);
      setCertified(undefined);

      const exportPackage = ExportBuilder.buildPackage(world);
      const smokeResult = await runIframeSmokeTest(exportPackage.files["single.html"]);

      if (cancelled) {
        return;
      }

      const result = await ExportBuilder.buildCertified(world, { smokeResult });
      if (!cancelled) {
        setCertified(result);
        setIsCertifying(false);
      }
    }

    certify().catch(async () => {
      if (cancelled) {
        return;
      }
      const result = await ExportBuilder.buildCertified(world, {
        smokeResult: {
          available: true,
          ready: false,
          renderer: "none",
          errors: ["Certification smoke test could not run."],
          events: [],
          interactionChanged: false,
          interactionMessage: "Interaction smoke test could not run.",
        },
      });
      setCertified(result);
      setIsCertifying(false);
    });

    return () => {
      cancelled = true;
    };
  }, [world]);

  const checksById = useMemo(() => {
    const map = new Map<string, ExportHealthCheck>();
    certified?.healthReport.checks.forEach((check) => map.set(check.id, check));
    return map;
  }, [certified]);

  const downloadZip = async () => {
    if (!certified?.canDownload) {
      return;
    }

    setIsExporting(true);
    try {
      const blob = await ExportBuilder.buildZipFromPackage(certified.package);
      downloadBlob(blob, `${world.exportSettings.packageName}.zip`);
    } finally {
      setIsExporting(false);
    }
  };

  const downloadSingleHtml = () => {
    if (!certified?.canDownload) {
      return;
    }
    downloadBlob(new Blob([certified.package.files["single.html"]], { type: "text/html" }), `${world.exportSettings.packageName}.html`);
  };

  const downloadReport = () => {
    if (!certified) {
      return;
    }
    downloadBlob(
      new Blob([JSON.stringify(certified.healthReport, null, 2)], { type: "application/json" }),
      `${world.exportSettings.packageName}-health-report.json`,
    );
  };

  const copyReport = async () => {
    if (!certified) {
      return;
    }
    await navigator.clipboard.writeText(JSON.stringify(certified.healthReport, null, 2));
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 1200);
  };

  const status = certified?.healthReport.overallStatus;

  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-label="Export quest">
      <section className="export-dialog certified-export-dialog">
        <div className="dialog-header">
          <div>
            <span>Export certification</span>
            <strong>{world.exportSettings.packageName}.zip</strong>
          </div>
          <button className="icon-button ghost" type="button" title="Close export dialog" onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        <div className={`export-health-hero ${status ?? "running"}`}>
          {isCertifying ? <Loader2 className="spin" size={20} /> : statusIcon(status)}
          <div>
            <strong>{isCertifying ? "Certifying export..." : statusLabel(status)}</strong>
            <span>
              {isCertifying
                ? "Building package, inspecting runtime independence and running local smoke checks."
                : statusMessage(status)}
            </span>
          </div>
        </div>

        {certified ? (
          <>
            <div className="export-metrics">
              <Metric label="Bundle" value={formatBytes(certified.healthReport.metrics.bundleBytes)} />
              <Metric label="Assets" value={formatBytes(certified.healthReport.metrics.assetBytes)} />
              <Metric label="First render" value={formatMs(certified.healthReport.metrics.estimatedFirstRenderMs)} />
              <Metric label="Files" value={String(certified.healthReport.artifacts.files.length)} />
            </div>

            <section className="export-contract-summary" aria-label="Runtime contract summary">
              <ContractFact label="Engine" value={certified.healthReport.engineVersion} />
              <ContractFact label="Runtime" value={certified.healthReport.runtimeVersion} />
              <ContractFact label="Spec" value={certified.healthReport.specVersion} />
              <ContractFact label="Export format" value={certified.healthReport.exportFormatVersion} />
              <ContractFact label="Compatibility" value={compatibilityLabel(certified.healthReport.compatibility.status)} />
              <ContractFact label="Migrations" value={migrationLabel(certified.healthReport.migrationsApplied, certified.healthReport.migrationWarnings)} />
              <ContractFact label="Required capabilities" value={requiredCapabilitiesLabel(certified.package.migration.migratedSpec.requiredCapabilities)} wide />
              <ContractFact label="Portability" value={certified.canDownload ? "Standalone, static and future-readable" : "Blocked until contract issues are fixed"} wide />
            </section>

            <div className="export-certification-grid">
              {checkGroups.map((group) => (
                <section className="cert-group" key={group.title}>
                  <div className="cert-group-title">{group.title}</div>
                  {group.ids.map((id) => {
                    const item = checksById.get(id);
                    return item ? <CheckRow check={item} key={id} /> : null;
                  })}
                </section>
              ))}
            </div>

            <div className="export-file-list compact">
              {certified.healthReport.artifacts.files.map((file) => (
                <div className="export-file-row" key={file.path}>
                  <FileArchive size={15} />
                  <span>{file.path}</span>
                  <small>{formatBytes(file.bytes)}</small>
                </div>
              ))}
            </div>
          </>
        ) : null}

        <div className="dialog-actions split">
          <div className="dialog-secondary-actions">
            <button className="tool-button" type="button" onClick={copyReport} disabled={!certified}>
              <Clipboard size={16} />
              {copyState === "copied" ? "Copied" : "Copy report JSON"}
            </button>
            <button className="tool-button" type="button" onClick={downloadReport} disabled={!certified}>
              <Download size={16} />
              Health report
            </button>
          </div>
          <div className="dialog-primary-actions">
            <button className="tool-button" type="button" onClick={downloadSingleHtml} disabled={!certified?.canDownload}>
              <Download size={16} />
              Single HTML
            </button>
            <button className="tool-button primary" type="button" onClick={downloadZip} disabled={!certified?.canDownload || isExporting}>
              <Download size={16} />
              {isExporting ? "Packaging..." : status === "warn" ? "Download ZIP anyway" : "Download ZIP"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="export-metric">
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function ContractFact({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`contract-fact ${wide ? "wide" : ""}`}>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function CheckRow({ check }: { check: ExportHealthCheck }) {
  return (
    <div className={`cert-check ${check.status}`}>
      {statusIcon(check.status)}
      <span>
        <strong>{check.label}</strong>
        <small>{check.message}</small>
      </span>
    </div>
  );
}

function statusIcon(status?: ExportHealthStatus) {
  if (status === "pass") {
    return <CheckCircle2 size={17} />;
  }
  if (status === "warn") {
    return <AlertTriangle size={17} />;
  }
  if (status === "fail") {
    return <XCircle size={17} />;
  }
  return <ShieldCheck size={17} />;
}

function statusLabel(status?: ExportHealthStatus) {
  if (status === "pass") {
    return "Certified: pass";
  }
  if (status === "warn") {
    return "Certified with warnings";
  }
  if (status === "fail") {
    return "Certification failed";
  }
  return "Certification pending";
}

function statusMessage(status?: ExportHealthStatus) {
  if (status === "pass") {
    return "This export is standalone, portable and passed smoke testing.";
  }
  if (status === "warn") {
    return "The export is downloadable, but review warnings before sending it to a customer.";
  }
  if (status === "fail") {
    return "Hard failures block download until the issues are fixed.";
  }
  return "Waiting for certification results.";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatMs(value?: number) {
  return value === undefined ? "Not measured" : `${Math.round(value)}ms`;
}

function compatibilityLabel(status: CertifiedExportResult["healthReport"]["compatibility"]["status"]) {
  if (status === "compatible") {
    return "Compatible";
  }
  if (status === "warning") {
    return "Compatible with warnings";
  }
  return "Incompatible";
}

function migrationLabel(applied: string[], warnings: string[]) {
  if (applied.length === 0 && warnings.length === 0) {
    return "None";
  }

  return [...applied, ...warnings].join(", ");
}

function requiredCapabilitiesLabel(capabilities: string[]) {
  return capabilities.length > 0 ? capabilities.join(", ") : "None";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function runIframeSmokeTest(singleHtml: string): Promise<BrowserSmokeResult> {
  if (typeof document === "undefined") {
    return unavailableSmokeResult();
  }

  const blob = new Blob([singleHtml], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "800px";
  iframe.style.height = "600px";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";

  try {
    const loaded = new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error("Smoke test iframe failed to load."));
    });
    iframe.src = url;
    document.body.appendChild(iframe);
    await loaded;

    const health = await waitForRuntimeHealth(iframe);
    const beforeEvents = Array.isArray(health.events) ? health.events.length : 0;
    const smokeClick = (iframe.contentWindow as unknown as { __AQE_SMOKE_CLICK_FIRST__?: () => { changed: boolean; message: string } })
      .__AQE_SMOKE_CLICK_FIRST__;
    const clickResult = smokeClick?.() ?? { changed: false, message: "Smoke click hook was unavailable." };
    const latest = getRuntimeHealth(iframe);
    const events = latest.events ?? [];

    return {
      available: true,
      ready: Boolean(latest.ready),
      renderer: latest.renderer,
      firstRenderMs: latest.firstRenderMs,
      errors: latest.errors ?? [],
      events,
      interactionChanged: clickResult.changed || events.length > beforeEvents,
      interactionMessage: clickResult.message,
    };
  } catch (error) {
    return {
      available: true,
      ready: false,
      renderer: "none",
      errors: [error instanceof Error ? error.message : "Smoke test failed."],
      events: [],
      interactionChanged: false,
      interactionMessage: "Interaction smoke test could not complete.",
    };
  } finally {
    iframe.remove();
    URL.revokeObjectURL(url);
  }
}

function unavailableSmokeResult(): BrowserSmokeResult {
  return {
    available: false,
    ready: false,
    renderer: "none",
    errors: [],
    events: [],
    interactionChanged: false,
    interactionMessage: "Browser smoke test is unavailable in this environment.",
  };
}

async function waitForRuntimeHealth(iframe: HTMLIFrameElement) {
  const started = performance.now();
  while (performance.now() - started < 2500) {
    const health = getRuntimeHealth(iframe);
    if (health.ready) {
      return health;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 40));
  }
  return getRuntimeHealth(iframe);
}

function getRuntimeHealth(iframe: HTMLIFrameElement): {
  ready: boolean;
  firstRenderMs?: number;
  renderer?: "webgl2" | "canvas2d" | "webgpu" | "none";
  errors?: string[];
  events?: string[];
} {
  const frameWindow = iframe.contentWindow as unknown as {
    __AQE_EXPORT_HEALTH__?: {
      ready?: boolean;
      firstRenderMs?: number;
      renderer?: "webgl2" | "canvas2d" | "webgpu" | "none";
      errors?: string[];
      events?: string[];
    };
  };
  return {
    ready: Boolean(frameWindow.__AQE_EXPORT_HEALTH__?.ready),
    firstRenderMs: frameWindow.__AQE_EXPORT_HEALTH__?.firstRenderMs,
    renderer: frameWindow.__AQE_EXPORT_HEALTH__?.renderer,
    errors: frameWindow.__AQE_EXPORT_HEALTH__?.errors,
    events: frameWindow.__AQE_EXPORT_HEALTH__?.events,
  };
}
