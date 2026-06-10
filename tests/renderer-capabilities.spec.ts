import { expect, test } from "@playwright/test";
import { RendererFactory } from "../src/engine/render/RendererFactory";
import type { RendererFeature } from "../src/engine/render/Renderer";
import { WorldSpecSchema } from "../src/engine/quest/WorldSpec";
import { ExportBuilder } from "../src/engine/export/ExportBuilder";
import { CyberRiskRoom } from "../src/templates/CyberRiskRoom";

test("RendererFactory selects WebGL2 by default for export", async () => {
  const result = await RendererFactory.create({
    canvas: fakeCanvas({ webgl2: true, canvas2d: true }),
    worldSpec: CyberRiskRoom,
    prefer: ["webgl2", "canvas2d", "static"],
    requiredFeatures: ["3d.primitives"],
    allowExperimental: false,
    fallbackMode: "degrade",
  });

  expect(result.backend).toBe("webgl2");
  expect(result.degraded).toBe(false);
});

test("RendererFactory skips WebGPU when allowExperimental is false", async () => {
  const result = await RendererFactory.create({
    canvas: fakeCanvas({ webgl2: true, canvas2d: true }),
    worldSpec: CyberRiskRoom,
    prefer: ["webgpu", "webgl2", "canvas2d", "static"],
    requiredFeatures: ["3d.primitives"],
    allowExperimental: false,
    fallbackMode: "degrade",
  });

  expect(result.backend).toBe("webgl2");
  expect(result.diagnostics.attemptedBackends[0]?.backend).toBe("webgpu");
  expect(result.diagnostics.attemptedBackends[0]?.reason).toContain("Experimental");
});

test("RendererFactory falls back to Canvas2D if WebGL2 is unavailable", async () => {
  const result = await RendererFactory.create({
    canvas: fakeCanvas({ webgl2: false, canvas2d: true }),
    worldSpec: CyberRiskRoom,
    prefer: ["webgl2", "canvas2d", "static"],
    requiredFeatures: ["3d.primitives"],
    allowExperimental: false,
    fallbackMode: "degrade",
  });

  expect(result.backend).toBe("canvas2d");
  expect(result.degraded).toBe(true);
  expect(result.degradationWarnings.map((issue) => issue.code)).toContain("renderer_feature_missing");
});

test("RendererFactory uses static fallback if no renderer context is available", async () => {
  const result = await RendererFactory.create({
    canvas: fakeCanvas({ webgl2: false, canvas2d: false }),
    worldSpec: CyberRiskRoom,
    prefer: ["webgl2", "canvas2d", "static"],
    requiredFeatures: ["3d.primitives"],
    allowExperimental: false,
    fallbackMode: "static",
  });

  expect(result.backend).toBe("static");
  expect(result.degraded).toBe(true);
});

test("RendererFactory fails when a required feature is missing in fail mode", async () => {
  await expect(
    RendererFactory.create({
      canvas: fakeCanvas({ webgl2: true, canvas2d: true }),
      worldSpec: CyberRiskRoom,
      prefer: ["webgl2", "canvas2d", "static"],
      requiredFeatures: ["assets.imageBillboard"],
      allowExperimental: false,
      fallbackMode: "fail",
    }),
  ).rejects.toThrow(/missing required features/i);
});

test("RendererFactory reports warnings when a required feature is missing in degrade mode", async () => {
  const result = await RendererFactory.create({
    canvas: fakeCanvas({ webgl2: true, canvas2d: true }),
    worldSpec: CyberRiskRoom,
    prefer: ["webgl2", "canvas2d", "static"],
    requiredFeatures: ["assets.imageBillboard"],
    allowExperimental: false,
    fallbackMode: "degrade",
  });

  expect(result.backend).toBe("webgl2");
  expect(result.degraded).toBe(true);
  expect(result.degradationWarnings.some((issue) => issue.feature === "assets.imageBillboard")).toBe(true);
});

test("WorldSpec renderer capabilities validate", () => {
  const result = WorldSpecSchema.safeParse({
    ...CyberRiskRoom,
    requiredCapabilities: ["3d.primitives", "3d.picking"] satisfies RendererFeature[],
    preferredRenderer: "webgl2",
    allowRendererDegradation: true,
  });

  expect(result.success).toBe(true);
});

test("Export certification fails if WebGPU is required", async () => {
  const webgpuOnly = {
    ...CyberRiskRoom,
    requiredCapabilities: ["renderer:webgpu"],
    preferredRenderer: "webgpu" as const,
    allowRendererDegradation: false,
  };

  const certified = await ExportBuilder.buildCertified(webgpuOnly);

  expect(certified.canDownload).toBe(false);
  expect(certified.healthReport.checks.find((check) => check.id === "webgpu_not_required_for_export")?.status).toBe("fail");
});

function fakeCanvas(options: { webgl2: boolean; canvas2d?: boolean }): HTMLCanvasElement {
  const gl = fakeWebGL2Context();
  const ctx = fakeCanvas2DContext();
  return {
    width: 800,
    height: 480,
    clientWidth: 800,
    clientHeight: 480,
    style: {},
    getContext: (type: string) => {
      if (type === "webgl2") {
        return options.webgl2 ? gl : null;
      }
      if (type === "2d") {
        return options.canvas2d === false ? null : ctx;
      }
      return null;
    },
  } as unknown as HTMLCanvasElement;
}

function fakeWebGL2Context(): WebGL2RenderingContext {
  return {
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
    MAX_TEXTURE_SIZE: 0x0d33,
    MAX_VERTEX_UNIFORM_VECTORS: 0x8dfb,
    DEPTH_TEST: 0x0b71,
    BLEND: 0x0be2,
    SRC_ALPHA: 0x0302,
    ONE_MINUS_SRC_ALPHA: 0x0303,
    LINES: 0x0001,
    TRIANGLES: 0x0004,
    UNSIGNED_SHORT: 0x1403,
    ARRAY_BUFFER: 0x8892,
    ELEMENT_ARRAY_BUFFER: 0x8893,
    STATIC_DRAW: 0x88e4,
    FLOAT: 0x1406,
    createShader: () => ({}),
    shaderSource: () => undefined,
    compileShader: () => undefined,
    getShaderParameter: () => true,
    getShaderInfoLog: () => "",
    createProgram: () => ({}),
    attachShader: () => undefined,
    linkProgram: () => undefined,
    getProgramParameter: () => true,
    getProgramInfoLog: () => "",
    useProgram: () => undefined,
    getUniformLocation: () => ({}),
    getAttribLocation: () => 0,
    enable: () => undefined,
    blendFunc: () => undefined,
    getParameter: (parameter: number) => (parameter === 0x0d33 ? 4096 : 256),
    viewport: () => undefined,
    clearColor: () => undefined,
    clear: () => undefined,
    uniformMatrix4fv: () => undefined,
    uniform4fv: () => undefined,
    createBuffer: () => ({}),
    bindBuffer: () => undefined,
    bufferData: () => undefined,
    enableVertexAttribArray: () => undefined,
    vertexAttribPointer: () => undefined,
    drawElements: () => undefined,
    deleteBuffer: () => undefined,
  } as unknown as WebGL2RenderingContext;
}

function fakeCanvas2DContext(): CanvasRenderingContext2D {
  return {
    setTransform: () => undefined,
    fillRect: () => undefined,
    fillText: () => undefined,
    measureText: (text: string) => ({ width: text.length * 7 }),
    beginPath: () => undefined,
    moveTo: () => undefined,
    arcTo: () => undefined,
    closePath: () => undefined,
    fill: () => undefined,
  } as unknown as CanvasRenderingContext2D;
}
