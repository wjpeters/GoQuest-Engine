import { History } from "lucide-react";
import type { CommandHistoryEntry } from "../commands";

interface HistoryPanelProps {
  entries: readonly CommandHistoryEntry[];
}

export function HistoryPanel({ entries }: HistoryPanelProps) {
  const latestEntries = [...entries].slice(-20).reverse();

  return (
    <section className="panel-section history-panel">
      <div className="section-heading">
        <span>History</span>
        <History size={15} />
      </div>
      {latestEntries.length ? (
        <div className="history-list">
          {latestEntries.map((entry) => (
            <article className="history-row" key={`${entry.id}-${entry.executedAt}`}>
              <strong>{entry.label}</strong>
              <span>
                {entry.source ?? "system"} · {formatHistoryTime(entry.executedAt)}
              </span>
            </article>
          ))}
        </div>
      ) : (
        <div className="history-empty">No undoable edits yet.</div>
      )}
    </section>
  );
}

function formatHistoryTime(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}
