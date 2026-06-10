import type { WorldSpec } from "../quest/WorldSpec";

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

export function renderRuntimeJs() {
  return `(() => {
  const specNode = document.getElementById("quest-spec");
  const world = JSON.parse(specNode.textContent);
  const canvas = document.getElementById("quest");
  const toast = document.getElementById("toast");
  const toastTitle = document.getElementById("toast-title");
  const toastMessage = document.getElementById("toast-message");
  const state = { completed: false };
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
  const trigger = (name, entityId) => world.interactions.filter(i => i.trigger === name && (!i.targetEntityId || i.targetEntityId === entityId)).forEach(i => evaluate(i.conditions) && i.actions.forEach(action));
  const gl = canvas.getContext("webgl2", { antialias: true, alpha: true });
  if (!gl) { document.body.insertAdjacentHTML("beforeend", "<p style='position:fixed;inset:auto 20px 20px;color:#fff'>WebGL2 unavailable.</p>"); return; }
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
  };
  const project = (e) => {
    const p = e.transform.position, v = vp(), x = v[0]*p[0]+v[4]*p[1]+v[8]*p[2]+v[12], y = v[1]*p[0]+v[5]*p[1]+v[9]*p[2]+v[13], w = v[3]*p[0]+v[7]*p[1]+v[11]*p[2]+v[15];
    return { x: (x/w*.5+.5)*canvas.clientWidth, y: (-y/w*.5+.5)*canvas.clientHeight, r: Math.max(22, Math.max(...e.transform.scale)*92/w), w };
  };
  canvas.addEventListener("click", (ev) => {
    const rect = canvas.getBoundingClientRect(), x = ev.clientX - rect.left, y = ev.clientY - rect.top;
    let best;
    for (const e of world.entities) if (e.visible && e.selectable) { const p = project(e); if (Math.hypot(p.x-x,p.y-y) <= p.r && (!best || p.w < best.p.w)) best = { e, p }; }
    if (best) trigger("click", best.e.id);
  });
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
