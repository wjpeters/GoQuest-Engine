import { Database, ImagePlus } from "lucide-react";
import type { WorldSpec } from "../../engine/quest/WorldSpec";

interface AssetPanelProps {
  world: WorldSpec;
}

export function AssetPanel({ world }: AssetPanelProps) {
  return (
    <section className="lower-panel">
      <div className="lower-panel-header">
        <div>
          <span>Assets</span>
          <strong>{world.assets.length} embedded references</strong>
        </div>
        <ImagePlus size={18} />
      </div>
      {world.assets.length ? (
        <div className="asset-list">
          {world.assets.map((asset) => (
            <article className="asset-row" key={asset.id}>
              <Database size={16} />
              <strong>{asset.name}</strong>
              <span>{asset.type}</span>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-panel-state">This MVP keeps templates geometry-first. Embedded assets can be added to the validated spec.</div>
      )}
    </section>
  );
}
