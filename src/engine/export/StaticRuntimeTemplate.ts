import type { WorldSpec } from "../quest/WorldSpec";
import { EXPORT_FORMAT_VERSION } from "../version/EngineVersion";
import { CURRENT_RUNTIME_CONTRACT } from "../version/RuntimeContract";

export function renderIndexHtml(world: WorldSpec) {
  const spec = JSON.stringify(world).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(world.title)}</title>
    <style>
      :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #080b14; color: #eef2ff; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; overflow: hidden; background: radial-gradient(circle at 20% 0%, #182238, #080b14 45%, #05060b); }
      #app { position: fixed; inset: 0; display: grid; grid-template-rows: 1fr auto; }
      canvas { width: 100%; height: 100%; display: block; touch-action: manipulation; }
      .hud { position: fixed; left: 20px; top: 18px; max-width: min(420px, calc(100vw - 40px)); padding: 14px 16px; border: 1px solid rgba(255,255,255,.16); border-radius: 14px; background: rgba(8,11,20,.72); backdrop-filter: blur(16px); box-shadow: 0 18px 60px rgba(0,0,0,.28); }
      .hud h1 { margin: 0; font-size: 16px; letter-spacing: 0; }
      .hud p { margin: 7px 0 0; color: #b8c0d8; font-size: 13px; line-height: 1.45; }
      .toast { position: fixed; right: 20px; bottom: 20px; max-width: min(440px, calc(100vw - 40px)); padding: 16px 18px; border-radius: 14px; border: 1px solid rgba(125,211,252,.35); background: rgba(9,13,24,.82); backdrop-filter: blur(18px); box-shadow: 0 22px 80px rgba(0,0,0,.34); display: none; }
      .toast.visible { display: block; }
      .toast strong { display: block; margin-bottom: 6px; font-size: 13px; color: #bae6fd; }
      .toast span { color: #eef2ff; font-size: 14px; line-height: 1.45; }
      .footer { position: fixed; left: 20px; bottom: 18px; color: #8c96ad; font-size: 12px; }
    </style>
  </head>
  <body>
    <div id="app"><canvas id="quest"></canvas></div>
    <section class="hud"><h1>${escapeHtml(world.title)}</h1><p>${escapeHtml(world.description)}</p></section>
    <aside class="toast" id="toast"><strong id="toast-title"></strong><span id="toast-message"></span></aside>
    <div class="footer">Standalone export · no network runtime required</div>
    <script type="application/json" id="quest-spec">${spec}</script>
    <script src="./runtime.js"></script>
  </body>
</html>`;
}

export function renderSingleHtml(world: WorldSpec) {
  return renderIndexHtml(world).replace('<script src="./runtime.js"></script>', `<script>${renderRuntimeJs()}</script>`);
}

export function renderRuntimeJs() {
  const contract = JSON.stringify(CURRENT_RUNTIME_CONTRACT).replace(/</g, "\\u003c");
  return `(() => {
  const runtimeContract = ${contract};
  window.__AQE_RUNTIME_CONTRACT__ = runtimeContract;
  const startedAt = performance.now();
  const diagnostics = {
    ready: false,
    firstRenderMs: undefined,
    renderer: {
      selectedBackend: "none",
      attemptedBackends: [],
      degraded: false,
      degradationWarnings: [],
      capabilities: undefined
    },
    selectedRenderer: "none",
    runtimeVersion: runtimeContract.runtimeVersion,
    specVersion: "unknown",
    exportFormatVersion: "${EXPORT_FORMAT_VERSION}",
    compatible: false,
    compatibilityIssues: [],
    errors: [],
    events: []
  };
  window.__AQE_RUNTIME_READY__ = false;
  window.__AQE_EXPORT_HEALTH__ = diagnostics;
  const recordError = (error) => diagnostics.errors.push(String(error && error.message ? error.message : error));
  addEventListener("error", (event) => recordError(event.message || "runtime error"));
  addEventListener("unhandledrejection", (event) => recordError(event.reason || "unhandled rejection"));
  const rendererFeatures = {
    webgl2: { "3d.primitives": true, "3d.lighting.basic": true, "3d.picking": true, "materials.color": true, "materials.opacity": true, "camera.perspective": true },
    canvas2d: { "2d.labels": true, "materials.color": true, "materials.opacity": true, "fallback.staticPreview": true },
    static: { "2d.labels": true, "fallback.staticPreview": true }
  };
  const attemptRenderer = (backend, available, reason) => {
    diagnostics.renderer.attemptedBackends.push({ backend, available, reason });
  };
  const markReady = (renderer, degraded = false, warnings = []) => {
    if (diagnostics.ready) return;
    diagnostics.ready = true;
    diagnostics.renderer.selectedBackend = renderer;
    diagnostics.renderer.degraded = degraded;
    diagnostics.renderer.degradationWarnings = warnings;
    diagnostics.renderer.capabilities = {
      backend: renderer,
      available: true,
      supported: true,
      experimental: false,
      features: rendererFeatures[renderer] || {}
    };
    diagnostics.selectedRenderer = renderer;
    diagnostics.firstRenderMs = performance.now() - startedAt;
    window.__AQE_RUNTIME_READY__ = true;
  };
  const specNode = document.getElementById("quest-spec");
  const world = JSON.parse(specNode.textContent);
  diagnostics.specVersion = world.specVersion || world.version || "0.0.0";
  diagnostics.compatibilityIssues = runtimeContract.supportedSpecVersions.includes(diagnostics.specVersion)
    ? []
    : [{ code: "runtime_spec_version_unsupported", severity: "error", message: "Runtime does not support this WorldSpec version.", details: { specVersion: diagnostics.specVersion, supportedSpecVersions: runtimeContract.supportedSpecVersions } }];
  diagnostics.compatible = diagnostics.compatibilityIssues.length === 0;
  const canvas = document.getElementById("quest");
  const toast = document.getElementById("toast");
  const toastTitle = document.getElementById("toast-title");
  const toastMessage = document.getElementById("toast-message");
  const state = { completed: false };
  const queryRenderer = new URLSearchParams(location.search).get("renderer");
  const rendererOverride = ["webgl2", "canvas2d", "static"].includes(queryRenderer) ? queryRenderer : undefined;
  const exportRendererPolicy = {
    defaultBackend: world.exportSettings?.defaultRenderer || "webgl2",
    prefer: rendererOverride ? [rendererOverride] : ["webgl2", "canvas2d", "static"],
    allowExperimentalWebGPU: false,
    fallbackMode: world.allowRendererDegradation === false ? "fail" : "degrade"
  };
  let pickEntity = () => undefined;
  const hex = (value, opacity = 1) => {
    const normalized = String(value || "#ffffff").replace("#", "").padEnd(6, "0").slice(0, 6);
    const int = Number.parseInt(normalized, 16);
    return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255, opacity];
  };
  const mat4 = {
    identity: () => new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),
    multiply: (a,b) => {
      const out = new Float32Array(16);
      for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) out[col*4+row] = a[row]*b[col*4]+a[4+row]*b[col*4+1]+a[8+row]*b[col*4+2]+a[12+row]*b[col*4+3];
      return out;
    },
    perspective: (fov, aspect, near, far) => {
      const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
      return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);
    },
    lookAt: (eye, target) => {
      const sub = (a,b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
      const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
      const cross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
      const norm = (v) => { const l = Math.hypot(v[0],v[1],v[2]) || 1; return [v[0]/l,v[1]/l,v[2]/l]; };
      const z = norm(sub(eye, target)), x = norm(cross([0,1,0], z)), y = norm(cross(z, x));
      return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
    },
    model: (entity) => {
      const [x,y,z] = entity.transform.position, [sx,sy,sz] = entity.transform.scale;
      const [rx,ry,rz] = entity.transform.rotation.map(v => v * Math.PI / 180);
      const t = new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1]);
      const mx = new Float32Array([1,0,0,0,0,Math.cos(rx),Math.sin(rx),0,0,-Math.sin(rx),Math.cos(rx),0,0,0,0,1]);
      const my = new Float32Array([Math.cos(ry),0,-Math.sin(ry),0,0,1,0,0,Math.sin(ry),0,Math.cos(ry),0,0,0,0,1]);
      const mz = new Float32Array([Math.cos(rz),Math.sin(rz),0,0,-Math.sin(rz),Math.cos(rz),0,0,0,0,1,0,0,0,0,1]);
      const s = new Float32Array([sx,0,0,0,0,sy,0,0,0,0,sz,0,0,0,0,1]);
      return mat4.multiply(mat4.multiply(mat4.multiply(mat4.multiply(t,mx),my),mz),s);
    }
  };
  const geometry = (type) => {
    if (["plane","text","hotspot","imageBillboard"].includes(type)) return { v: new Float32Array([-0.5,0,-0.5,0.5,0,-0.5,0.5,0,0.5,-0.5,0,0.5]), i: new Uint16Array([0,1,2,0,2,3]) };
    const v = new Float32Array([-0.5,-0.5,-0.5,0.5,-0.5,-0.5,0.5,0.5,-0.5,-0.5,0.5,-0.5,-0.5,-0.5,0.5,0.5,-0.5,0.5,0.5,0.5,0.5,-0.5,0.5,0.5]);
    const i = new Uint16Array([0,1,2,0,2,3,4,6,5,4,7,6,4,5,1,4,1,0,7,3,2,7,2,6,5,6,2,5,2,1,4,0,3,4,3,7]);
    return { v, i };
  };
  const evaluate = (conditions = []) => conditions.every(c => {
    if (c.type === "variableEquals") return world.quest.variables[c.variable] === c.value;
    if (c.type === "variableAtLeast") return Number(world.quest.variables[c.variable] || 0) >= c.value;
    if (c.type === "scoreAtLeast") return world.quest.score >= c.value;
    if (c.type === "stageIs") return world.quest.currentStage === c.stageId;
    return true;
  });
  const action = (a) => {
    if (a.type === "setVariable") world.quest.variables[a.variable] = a.value;
    if (a.type === "incrementVariable") world.quest.variables[a.variable] = Number(world.quest.variables[a.variable] || 0) + a.amount;
    if (a.type === "addScore") world.quest.score += a.amount;
    if (a.type === "showMessage") { toastTitle.textContent = a.title || "Quest update"; toastMessage.textContent = a.message; toast.classList.add("visible"); }
    if (a.type === "highlightEntity") { const e = world.entities.find(e => e.id === a.entityId); if (e) e.material.color = a.color; }
    if (a.type === "hideEntity") { const e = world.entities.find(e => e.id === a.entityId); if (e) e.visible = false; }
    if (a.type === "showEntity") { const e = world.entities.find(e => e.id === a.entityId); if (e) e.visible = true; }
    if (a.type === "moveCamera") { world.camera.position = a.position; world.camera.target = a.target; }
    if (a.type === "gotoStage") world.quest.currentStage = a.stageId;
    if (a.type === "completeQuest") state.completed = true;
  };
  const trigger = (name, entityId) => {
    let applied = 0;
    world.interactions.filter(i => i.trigger === name && (!i.targetEntityId || i.targetEntityId === entityId)).forEach(i => {
      if (!evaluate(i.conditions)) return;
      diagnostics.events.push(name + ":" + (entityId || "scene") + ":" + i.id);
      i.actions.forEach(action);
      applied += 1;
    });
    return applied;
  };
  canvas.addEventListener("click", (ev) => {
    const rect = canvas.getBoundingClientRect(), x = ev.clientX - rect.left, y = ev.clientY - rect.top;
    const entity = pickEntity(x, y);
    if (entity) trigger("click", entity.id);
  });
  window.__AQE_SMOKE_CLICK_FIRST__ = () => {
    const before = diagnostics.events.length;
    const interaction = world.interactions.find(i => i.trigger === "click" && i.targetEntityId);
    if (!interaction) return { changed: false, message: "No click interactions are available." };
    try {
      const applied = trigger("click", interaction.targetEntityId);
      return {
        changed: diagnostics.events.length > before && applied > 0,
        message: applied > 0 ? "First click interaction executed." : "First click interaction did not pass its conditions."
      };
    } catch (error) {
      recordError(error);
      return { changed: false, message: "First click interaction threw an error." };
    }
  };
  window.__AQE_TEST_HOOKS__ = {
    getHealth: () => diagnostics,
    getEventCount: () => diagnostics.events.length,
    getState: () => ({
      quest: JSON.parse(JSON.stringify(world.quest)),
      completed: state.completed,
      visibleEntityIds: world.entities.filter(e => e.visible).map(e => e.id)
    }),
    clickFirstInteraction: () => window.__AQE_SMOKE_CLICK_FIRST__(),
    forceRenderer: (backend) => {
      if (!["webgl2", "canvas2d", "static"].includes(backend)) return false;
      const next = new URL(location.href);
      next.searchParams.set("renderer", backend);
      location.href = next.toString();
      return true;
    }
  };
  const drawCanvas2d = (degraded = true) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      recordError("Canvas2D unavailable.");
      drawStaticFallback();
      return;
    }
    const resize2d = () => {
      const ratio = devicePixelRatio || 1;
      canvas.width = Math.floor(innerWidth * ratio);
      canvas.height = Math.floor(innerHeight * ratio);
      canvas.style.width = innerWidth + "px";
      canvas.style.height = innerHeight + "px";
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const frame2d = () => {
      requestAnimationFrame(frame2d);
      ctx.fillStyle = world.environment.background || "#080b14";
      ctx.fillRect(0, 0, innerWidth, innerHeight);
      for (const e of world.entities) {
        if (!e.visible) continue;
        const p = e.transform.position, s = e.transform.scale;
        const size = Math.max(18, 56 / Math.max(1, p[2] + 5));
        ctx.globalAlpha = e.material.opacity;
        ctx.fillStyle = e.material.color;
        ctx.fillRect(innerWidth / 2 + p[0] * 70 - size / 2, innerHeight / 2 - p[1] * 70 - size / 2, size * s[0], size * s[1]);
      }
      ctx.globalAlpha = 1;
      markReady("canvas2d", degraded, degraded ? [{ code: "canvas2d_visual_degradation", severity: "warn", message: "Canvas2D renders a simplified scene." }] : []);
    };
    pickEntity = (x, y) => {
      let best;
      for (const e of world.entities) {
        if (!e.visible || !e.selectable) continue;
        const p = e.transform.position, s = e.transform.scale;
        const size = Math.max(18, 56 / Math.max(1, p[2] + 5));
        const ex = innerWidth / 2 + p[0] * 70;
        const ey = innerHeight / 2 - p[1] * 70;
        const hit = x >= ex - size / 2 && x <= ex - size / 2 + size * s[0] && y >= ey - size / 2 && y <= ey - size / 2 + size * s[1];
        if (hit) best = e;
      }
      return best;
    };
    addEventListener("resize", resize2d);
    resize2d();
    trigger("sceneStart");
    frame2d();
  };
  const drawStaticFallback = () => {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      const fallback = document.createElement("section");
      fallback.style.cssText = "position:fixed;inset:0;padding:24px;background:#080b14;color:#eef2ff;font-family:system-ui,sans-serif";
      fallback.innerHTML = "<h1>" + world.title + "</h1><p>" + (world.description || "Interactive rendering is unavailable.") + "</p><p>Static fallback preview.</p>";
      document.body.appendChild(fallback);
      markReady("static", true, [{ code: "static_dom_fallback", severity: "warn", message: "Canvas unavailable; DOM static fallback shown." }]);
      return;
    }
    const resizeStatic = () => {
      const ratio = devicePixelRatio || 1;
      canvas.width = Math.floor(innerWidth * ratio);
      canvas.height = Math.floor(innerHeight * ratio);
      canvas.style.width = innerWidth + "px";
      canvas.style.height = innerHeight + "px";
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const frameStatic = () => {
      ctx.fillStyle = world.environment.background || "#080b14";
      ctx.fillRect(0, 0, innerWidth, innerHeight);
      ctx.fillStyle = "#eef2ff";
      ctx.font = "700 22px Inter, system-ui, sans-serif";
      ctx.fillText(world.title, 24, 44);
      ctx.fillStyle = "#b8c0d8";
      ctx.font = "13px Inter, system-ui, sans-serif";
      ctx.fillText(world.description || "Interactive rendering is unavailable.", 24, 74);
      ctx.fillStyle = "#facc15";
      ctx.font = "700 13px Inter, system-ui, sans-serif";
      ctx.fillText("Static fallback preview", 24, 116);
      world.entities.filter(e => e.visible).slice(0, 8).forEach((e, index) => {
        const y = 154 + index * 30;
        ctx.fillStyle = "rgba(255,255,255,.08)";
        ctx.fillRect(24, y - 18, Math.min(520, innerWidth - 48), 24);
        ctx.fillStyle = e.material.color || "#8ab4ff";
        ctx.fillRect(36, y - 10, 10, 10);
        ctx.fillStyle = "#eef2ff";
        ctx.font = "12px Inter, system-ui, sans-serif";
        ctx.fillText(e.name + " (" + e.type + ")", 56, y);
      });
      markReady("static", true, [{ code: "static_renderer_selected", severity: "warn", message: "Interactive 3D rendering is unavailable." }]);
    };
    pickEntity = () => undefined;
    addEventListener("resize", () => { resizeStatic(); frameStatic(); });
    resizeStatic();
    trigger("sceneStart");
    frameStatic();
  };
  const RendererFactory = {
    create: () => {
      const prefer = exportRendererPolicy.prefer;
      for (const backend of prefer) {
        if (backend === "webgl2") {
          const gl = canvas.getContext("webgl2", { antialias: true, alpha: true });
          if (gl) {
            attemptRenderer("webgl2", true, "WebGL2 context available.");
            return { backend, gl };
          }
          attemptRenderer("webgl2", false, "WebGL2 context unavailable.");
        }
        if (backend === "canvas2d") {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            attemptRenderer("canvas2d", true, "Canvas2D context available.");
            return { backend };
          }
          attemptRenderer("canvas2d", false, "Canvas2D context unavailable.");
        }
        if (backend === "static") {
          attemptRenderer("static", true, "Static fallback is always available.");
          return { backend };
        }
      }
      attemptRenderer("static", true, "No preferred renderer was available; static fallback selected.");
      return { backend: "static" };
    }
  };
  const selectedRenderer = RendererFactory.create();
  if (selectedRenderer.backend === "canvas2d") { drawCanvas2d(selectedRenderer.backend !== exportRendererPolicy.defaultBackend); return; }
  if (selectedRenderer.backend === "static") { drawStaticFallback(); return; }
  const gl = selectedRenderer.gl;
  if (!gl) { drawCanvas2d(true); return; }
  const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, "#version 300 es\\nin vec3 aPosition;uniform mat4 uModel;uniform mat4 uViewProjection;void main(){gl_Position=uViewProjection*uModel*vec4(aPosition,1.0);}"));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, "#version 300 es\\nprecision highp float;uniform vec4 uColor;out vec4 outColor;void main(){outColor=uColor;}"));
  gl.linkProgram(program); gl.useProgram(program); gl.enable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const loc = { p: gl.getAttribLocation(program, "aPosition"), m: gl.getUniformLocation(program, "uModel"), vp: gl.getUniformLocation(program, "uViewProjection"), c: gl.getUniformLocation(program, "uColor") };
  const meshes = new Map();
  const mesh = (type) => {
    if (meshes.has(type)) return meshes.get(type);
    const g = geometry(type), vb = gl.createBuffer(), ib = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, g.v, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.i, gl.STATIC_DRAW);
    const out = { vb, ib, n: g.i.length }; meshes.set(type, out); return out;
  };
  const resize = () => { const r = devicePixelRatio || 1; canvas.width = Math.floor(innerWidth*r); canvas.height = Math.floor(innerHeight*r); gl.viewport(0,0,canvas.width,canvas.height); };
  const vp = () => mat4.multiply(mat4.perspective(world.camera.fov*Math.PI/180, canvas.width/Math.max(canvas.height,1), world.camera.near, world.camera.far), mat4.lookAt(world.camera.position, world.camera.target));
  const draw = () => {
    requestAnimationFrame(draw);
    const bg = hex(world.environment.background); gl.clearColor(bg[0],bg[1],bg[2],1); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const viewProjection = vp(); gl.uniformMatrix4fv(loc.vp, false, viewProjection);
    for (const e of world.entities) {
      if (!e.visible) continue;
      const m = mesh(e.type); gl.bindBuffer(gl.ARRAY_BUFFER, m.vb); gl.enableVertexAttribArray(loc.p); gl.vertexAttribPointer(loc.p, 3, gl.FLOAT, false, 0, 0); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ib);
      gl.uniformMatrix4fv(loc.m, false, mat4.model(e)); gl.uniform4fv(loc.c, hex(e.material.color, e.material.opacity)); gl.drawElements(gl.TRIANGLES, m.n, gl.UNSIGNED_SHORT, 0);
    }
    markReady("webgl2");
  };
  const project = (e) => {
    const p = e.transform.position, v = vp(), x = v[0]*p[0]+v[4]*p[1]+v[8]*p[2]+v[12], y = v[1]*p[0]+v[5]*p[1]+v[9]*p[2]+v[13], w = v[3]*p[0]+v[7]*p[1]+v[11]*p[2]+v[15];
    return { x: (x/w*.5+.5)*canvas.clientWidth, y: (-y/w*.5+.5)*canvas.clientHeight, r: Math.max(22, Math.max(...e.transform.scale)*92/w), w };
  };
  pickEntity = (x, y) => {
    let best;
    for (const e of world.entities) if (e.visible && e.selectable) { const p = project(e); if (Math.hypot(p.x-x,p.y-y) <= p.r && (!best || p.w < best.p.w)) best = { e, p }; }
    return best?.e;
  };
  addEventListener("resize", resize); resize(); trigger("sceneStart"); draw();
})();`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
