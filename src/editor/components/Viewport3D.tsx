import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Cpu, MousePointerClick, Rotate3D } from "lucide-react";
import { EventBus } from "../../engine/core/EventBus";
import { Canvas2DRenderer } from "../../engine/render/Canvas2DRenderer";
import type { Renderer } from "../../engine/render/Renderer";
import { WebGL2Renderer } from "../../engine/render/WebGL2Renderer";
import { SceneSerializer } from "../../engine/scene/SceneSerializer";
import { QuestRuntime, type QuestRuntimeMessage } from "../../engine/quest/QuestRuntime";
import type { WorldSpec } from "../../engine/quest/WorldSpec";
import { pickEntityAt } from "../../engine/input/Picking";
import { QuestEvents } from "../../engine/quest/Events";

interface Viewport3DProps {
  world: WorldSpec;
  selectedId?: string;
  onSelectEntity: (id: string) => void;
  onWorldChange: (world: WorldSpec) => void;
  onRuntimeMessage: (message?: QuestRuntimeMessage) => void;
}

export function Viewport3D({ world, selectedId, onSelectEntity, onWorldChange, onRuntimeMessage }: Viewport3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef(world);
  const [rendererMode, setRendererMode] = useState<Renderer["mode"]>("webgl2");
  const [rendererError, setRendererError] = useState<string>();
  const scene = useMemo(() => SceneSerializer.fromWorldSpec(world), [world]);

  useEffect(() => {
    worldRef.current = world;
  }, [world]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const shell = canvas?.parentElement;
    if (!canvas || !shell) {
      return;
    }

    let renderer: Renderer;
    try {
      renderer = new WebGL2Renderer(canvas);
      setRendererMode("webgl2");
      setRendererError(undefined);
    } catch (error) {
      renderer = new Canvas2DRenderer(canvas);
      setRendererMode("canvas2d");
      setRendererError(error instanceof Error ? error.message : "WebGL2 unavailable.");
    }

    const resize = () => {
      const rect = shell.getBoundingClientRect();
      renderer.resize(rect.width, rect.height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(shell);
    resize();

    let frame = 0;
    const loop = () => {
      renderer.render(SceneSerializer.fromWorldSpec(worldRef.current), worldRef.current);
      frame = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const events = new EventBus();
    events.on<QuestRuntimeMessage>(QuestEvents.message, (message) => onRuntimeMessage(message));
    const runtime = new QuestRuntime(world, events);
    runtime.start();
  }, [world.id, onRuntimeMessage]);

  const selected = world.entities.find((entity) => entity.id === selectedId);

  return (
    <main className="viewport-region">
      <div className="viewport-shell">
        <canvas
          ref={canvasRef}
          aria-label="3D quest viewport"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const entity = pickEntityAt(world, event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height);
            if (!entity) {
              return;
            }
            onSelectEntity(entity.id);

            const events = new EventBus();
            events.on<QuestRuntimeMessage>(QuestEvents.message, (message) => onRuntimeMessage(message));
            const runtime = new QuestRuntime(world, events);
            runtime.handleTrigger("click", entity.id);
            onWorldChange(runtime.world);
          }}
        />

        <div className="viewport-top-left">
          <span className="viewport-badge">
            <Cpu size={14} />
            {rendererMode === "webgl2" ? "WebGL2 renderer" : "Canvas fallback"}
          </span>
          {rendererError ? (
            <span className="viewport-badge warning">
              <AlertTriangle size={14} />
              {rendererError}
            </span>
          ) : null}
        </div>

        <div className="viewport-bottom-left">
          <span className="hint-pill">
            <MousePointerClick size={14} />
            Click objects to preview quest actions
          </span>
          <span className="hint-pill">
            <Rotate3D size={14} />
            {scene.all().filter((entity) => entity.spec.visible).length} visible entities
          </span>
        </div>

        {selected ? (
          <div className="selection-card">
            <span>Selected</span>
            <strong>{selected.name}</strong>
            <small>{selected.id}</small>
          </div>
        ) : (
          <div className="empty-selection">Select an entity from the viewport or hierarchy.</div>
        )}
      </div>
    </main>
  );
}
