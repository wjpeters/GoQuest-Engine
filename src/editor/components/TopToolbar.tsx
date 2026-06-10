import { Download, PanelRight, Play, Redo2, RefreshCcw, Sparkles, SunMedium, Undo2 } from "lucide-react";
import type { WorldSpec } from "../../engine/quest/WorldSpec";

interface TopToolbarProps {
  world: WorldSpec;
  isInspectorOpen: boolean;
  onToggleInspector: () => void;
  onExport: () => void;
  onGenerate: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel?: string;
  redoLabel?: string;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
}

export function TopToolbar({
  world,
  isInspectorOpen,
  onToggleInspector,
  onExport,
  onGenerate,
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
  onUndo,
  onRedo,
  onReset,
}: TopToolbarProps) {
  return (
    <header className="top-toolbar">
      <div className="brand-lockup">
        <div className="brand-mark">AQ</div>
        <div>
          <span className="app-kicker">AI Quest Engine 3D Lite</span>
          <h1>{world.title}</h1>
        </div>
      </div>

      <div className="toolbar-status">
        <span className="status-pill">
          <Play size={14} />
          Live preview
        </span>
        <span className="status-pill muted">Standalone export</span>
      </div>

      <div className="toolbar-actions">
        <button
          className="icon-button ghost"
          type="button"
          title={undoLabel ? `Undo: ${undoLabel}` : "Undo"}
          onClick={onUndo}
          disabled={!canUndo}
        >
          <Undo2 size={17} />
        </button>
        <button
          className="icon-button ghost"
          type="button"
          title={redoLabel ? `Redo: ${redoLabel}` : "Redo"}
          onClick={onRedo}
          disabled={!canRedo}
        >
          <Redo2 size={17} />
        </button>
        <button className="icon-button ghost" type="button" title="Reset template" onClick={onReset}>
          <RefreshCcw size={17} />
        </button>
        <button className="icon-button ghost" type="button" title="Theme ready">
          <SunMedium size={17} />
        </button>
        <button className="tool-button" type="button" onClick={onGenerate}>
          <Sparkles size={17} />
          Generate spec
        </button>
        <button className="tool-button primary" type="button" onClick={onExport}>
          <Download size={17} />
          Export
        </button>
        <button
          className={`icon-button ghost inspector-toggle ${isInspectorOpen ? "active" : ""}`}
          type="button"
          title="Toggle inspector"
          onClick={onToggleInspector}
        >
          <PanelRight size={17} />
        </button>
      </div>
    </header>
  );
}
