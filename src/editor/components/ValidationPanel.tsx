import { CheckCircle2, ShieldCheck, TriangleAlert } from "lucide-react";
import { validateWorldSpec, type WorldSpec } from "../../engine/quest/WorldSpec";
import { checkRuntimeCompatibility } from "../../engine/version/Compatibility";
import { EXPORT_FORMAT_VERSION, RUNTIME_VERSION } from "../../engine/version/EngineVersion";
import { CURRENT_RUNTIME_CONTRACT } from "../../engine/version/RuntimeContract";

interface ValidationPanelProps {
  world: WorldSpec;
}

export function ValidationPanel({ world }: ValidationPanelProps) {
  const result = validateWorldSpec(world);
  const compatibility = result.success ? checkRuntimeCompatibility(result.data, CURRENT_RUNTIME_CONTRACT) : undefined;

  return (
    <section className="validation-panel">
      <div className="validation-head">
        <ShieldCheck size={17} />
        <span>Schema validation</span>
      </div>
      {result.success ? (
        <>
          <div className="validation-success">
            <CheckCircle2 size={16} />
            {compatibility?.status === "incompatible" ? "Schema valid, contract blocked" : "Exportable"}
          </div>
          <div className="validation-contract">
            <span>Spec {result.data.specVersion}</span>
            <span>Runtime {RUNTIME_VERSION}</span>
            <span>Export {EXPORT_FORMAT_VERSION}</span>
            <span>{compatibility?.status === "compatible" ? "Contract compatible" : compatibility?.status === "warning" ? "Contract warning" : "Contract issue"}</span>
          </div>
        </>
      ) : (
        <div className="validation-errors">
          <TriangleAlert size={16} />
          {result.error.issues.slice(0, 3).map((issue) => (
            <span key={`${issue.path.join(".")}-${issue.message}`}>
              {issue.path.join(".")}: {issue.message}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
