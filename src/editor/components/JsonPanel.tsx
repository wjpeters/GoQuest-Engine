import { useEffect, useState } from "react";
import { Braces, CheckCircle2, TriangleAlert } from "lucide-react";
import { WorldSpecSchema, type WorldSpec } from "../../engine/quest/WorldSpec";

interface JsonPanelProps {
  world: WorldSpec;
  onApply: (world: WorldSpec) => void;
}

export function JsonPanel({ world, onApply }: JsonPanelProps) {
  const [draft, setDraft] = useState(() => JSON.stringify(world, null, 2));
  const [error, setError] = useState<string>();

  useEffect(() => {
    setDraft(JSON.stringify(world, null, 2));
    setError(undefined);
  }, [world]);

  return (
    <section className="lower-panel json-panel">
      <div className="lower-panel-header">
        <div>
          <span>Advanced JSON</span>
          <strong>Validated spec editor</strong>
        </div>
        <Braces size={18} />
      </div>
      <textarea value={draft} spellCheck={false} onChange={(event) => setDraft(event.target.value)} />
      <div className="json-actions">
        {error ? (
          <span className="json-error">
            <TriangleAlert size={15} />
            {error}
          </span>
        ) : (
          <span className="json-ok">
            <CheckCircle2 size={15} />
            Schema-ready
          </span>
        )}
        <button
          className="tool-button primary"
          type="button"
          onClick={() => {
            try {
              const parsed = WorldSpecSchema.parse(JSON.parse(draft));
              setError(undefined);
              onApply(parsed);
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "Invalid JSON");
            }
          }}
        >
          Apply JSON
        </button>
      </div>
    </section>
  );
}
