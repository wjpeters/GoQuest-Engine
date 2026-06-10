import { CheckCircle2, ShieldCheck, TriangleAlert } from "lucide-react";
import { validateWorldSpec, type WorldSpec } from "../../engine/quest/WorldSpec";

interface ValidationPanelProps {
  world: WorldSpec;
}

export function ValidationPanel({ world }: ValidationPanelProps) {
  const result = validateWorldSpec(world);

  return (
    <section className="validation-panel">
      <div className="validation-head">
        <ShieldCheck size={17} />
        <span>Schema validation</span>
      </div>
      {result.success ? (
        <div className="validation-success">
          <CheckCircle2 size={16} />
          Exportable
        </div>
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
