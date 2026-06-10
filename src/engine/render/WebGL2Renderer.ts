import type { Renderer } from "./Renderer";
import type { Scene } from "../scene/Scene";
import type { WorldSpec } from "../quest/WorldSpec";
import { ShaderProgram } from "./ShaderProgram";
import { createViewProjection } from "./Camera";
import { geometryForEntity, gridGeometry } from "./Geometry";
import type { MeshData } from "./Mesh";
import { hexToRgba } from "./Material";

interface GpuMesh {
  vertex: WebGLBuffer;
  index: WebGLBuffer;
  indexCount: number;
}

const VERTEX_SOURCE = `#version 300 es
in vec3 aPosition;
uniform mat4 uModel;
uniform mat4 uViewProjection;
void main() {
  gl_Position = uViewProjection * uModel * vec4(aPosition, 1.0);
}`;

const FRAGMENT_SOURCE = `#version 300 es
precision highp float;
uniform vec4 uColor;
out vec4 outColor;
void main() {
  outColor = uColor;
}`;

export class WebGL2Renderer implements Renderer {
  readonly mode = "webgl2" as const;
  private gl: WebGL2RenderingContext;
  private shader: ShaderProgram;
  private meshCache = new Map<string, GpuMesh>();
  private grid?: GpuMesh;
  private positionLocation: number;
  private modelLocation: WebGLUniformLocation | null;
  private viewProjectionLocation: WebGLUniformLocation | null;
  private colorLocation: WebGLUniformLocation | null;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { antialias: true, alpha: true });
    if (!gl) {
      throw new Error("WebGL2 is not available in this browser.");
    }
    this.gl = gl;
    this.shader = new ShaderProgram(gl, VERTEX_SOURCE, FRAGMENT_SOURCE);
    this.positionLocation = this.shader.attrib("aPosition");
    this.modelLocation = this.shader.uniform("uModel");
    this.viewProjectionLocation = this.shader.uniform("uViewProjection");
    this.colorLocation = this.shader.uniform("uColor");
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  resize(width: number, height: number) {
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const canvasWidth = Math.floor(width * ratio);
    const canvasHeight = Math.floor(height * ratio);
    if (this.canvas.width !== canvasWidth || this.canvas.height !== canvasHeight) {
      this.canvas.width = canvasWidth;
      this.canvas.height = canvasHeight;
    }
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  render(scene: Scene, world: WorldSpec) {
    const gl = this.gl;
    const [r, g, b] = hexToRgba(world.environment.background);
    gl.clearColor(r, g, b, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.shader.use();

    const viewProjection = createViewProjection(world, this.canvas.width / Math.max(this.canvas.height, 1));
    gl.uniformMatrix4fv(this.viewProjectionLocation, false, viewProjection);

    if (world.environment.showGrid) {
      this.grid ??= this.createGpuMesh(gridGeometry());
      gl.uniformMatrix4fv(this.modelLocation, false, new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -0.01, 0, 1]));
      gl.uniform4fv(this.colorLocation, hexToRgba(world.environment.gridColor, 0.52));
      this.drawMesh(this.grid, gl.LINES);
    }

    scene.all().forEach((entity) => {
      if (!entity.spec.visible) {
        return;
      }
      const cacheKey = `${entity.spec.id}:${entity.spec.type}:${JSON.stringify(entity.spec.geometry)}`;
      const mesh = this.meshCache.get(cacheKey) ?? this.cacheMesh(cacheKey, geometryForEntity(entity.spec));
      const model = entity.transform.toMatrix();
      const color = entity.spec.material.emissive ?? entity.spec.material.color;
      gl.uniformMatrix4fv(this.modelLocation, false, model);
      gl.uniform4fv(this.colorLocation, hexToRgba(color, entity.spec.material.opacity));
      this.drawMesh(mesh, gl.TRIANGLES);
    });
  }

  dispose() {
    [...this.meshCache.values(), this.grid].filter(Boolean).forEach((mesh) => {
      this.gl.deleteBuffer(mesh?.vertex ?? null);
      this.gl.deleteBuffer(mesh?.index ?? null);
    });
    this.meshCache.clear();
  }

  private cacheMesh(key: string, data: MeshData) {
    const mesh = this.createGpuMesh(data);
    this.meshCache.set(key, mesh);
    return mesh;
  }

  private createGpuMesh(data: MeshData): GpuMesh {
    const vertex = this.gl.createBuffer();
    const index = this.gl.createBuffer();
    if (!vertex || !index) {
      throw new Error("Unable to allocate WebGL buffers.");
    }
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertex);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, data.vertices, this.gl.STATIC_DRAW);
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, index);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, data.indices, this.gl.STATIC_DRAW);
    return { vertex, index, indexCount: data.indices.length };
  }

  private drawMesh(mesh: GpuMesh, mode: number) {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.vertex);
    this.gl.enableVertexAttribArray(this.positionLocation);
    this.gl.vertexAttribPointer(this.positionLocation, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, mesh.index);
    this.gl.drawElements(mode, mesh.indexCount, this.gl.UNSIGNED_SHORT, 0);
  }
}
