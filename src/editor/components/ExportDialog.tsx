import { useMemo, useState } from "react";
import { CheckCircle2, Download, FileArchive, X } from "lucide-react";
import { ExportBuilder } from "../../engine/export/ExportBuilder";
import type { WorldSpec } from "../../engine/quest/WorldSpec";

interface ExportDialogProps {
  world: WorldSpec;
  onClose: () => void;
}

export function ExportDialog({ world, onClose }: ExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const files = useMemo(() => ExportBuilder.buildFiles(world), [world]);

  const downloadZip = async () => {
    setIsExporting(true);
    try {
      const blob = await ExportBuilder.buildZip(world);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${world.exportSettings.packageName}.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const downloadIndex = () => {
    const blob = new Blob([files["index.html"]], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "index.html";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-label="Export quest">
      <section className="export-dialog">
        <div className="dialog-header">
          <div>
            <span>Standalone export</span>
            <strong>{world.exportSettings.packageName}.zip</strong>
          </div>
          <button className="icon-button ghost" type="button" title="Close export dialog" onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        <div className="export-summary">
          <CheckCircle2 size={18} />
          <span>Runtime contains embedded quest JSON and does not call APIs, databases, auth, CDN, or the editor host.</span>
        </div>

        <div className="export-file-list">
          {Object.keys(files).map((file) => (
            <div className="export-file-row" key={file}>
              <FileArchive size={15} />
              <span>{file}</span>
            </div>
          ))}
        </div>

        <div className="dialog-actions">
          <button className="tool-button" type="button" onClick={downloadIndex}>
            <Download size={16} />
            Download index
          </button>
          <button className="tool-button primary" type="button" onClick={downloadZip} disabled={isExporting}>
            <Download size={16} />
            {isExporting ? "Packaging..." : "Download ZIP"}
          </button>
        </div>
      </section>
    </div>
  );
}
