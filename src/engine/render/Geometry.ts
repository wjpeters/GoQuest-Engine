import type { EntitySpec } from "../quest/WorldSpec";
import type { MeshData } from "./Mesh";

function createBox(): MeshData {
  const p = [
    -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, 0.5,
    -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
  ];
  const indices = [
    0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 4, 5, 1, 4, 1, 0, 7, 3, 2, 7, 2, 6, 5, 6, 2, 5, 2,
    1, 4, 0, 3, 4, 3, 7,
  ];
  return { vertices: new Float32Array(p), indices: new Uint16Array(indices) };
}

function createPlane(): MeshData {
  return {
    vertices: new Float32Array([-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5]),
    indices: new Uint16Array([0, 1, 2, 0, 2, 3]),
  };
}

function createSphere(segments = 20, rings = 12): MeshData {
  const vertices: number[] = [];
  const indices: number[] = [];
  for (let y = 0; y <= rings; y += 1) {
    const v = y / rings;
    const theta = v * Math.PI;
    for (let x = 0; x <= segments; x += 1) {
      const u = x / segments;
      const phi = u * Math.PI * 2;
      vertices.push(Math.sin(theta) * Math.cos(phi) * 0.5, Math.cos(theta) * 0.5, Math.sin(theta) * Math.sin(phi) * 0.5);
    }
  }
  for (let y = 0; y < rings; y += 1) {
    for (let x = 0; x < segments; x += 1) {
      const a = y * (segments + 1) + x;
      const b = a + segments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}

function createCylinder(segments = 24, cone = false): MeshData {
  const vertices: number[] = [0, 0.5, 0, 0, -0.5, 0];
  const indices: number[] = [];
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * 0.5;
    const z = Math.sin(angle) * 0.5;
    vertices.push(cone ? 0 : x, 0.5, cone ? 0 : z, x, -0.5, z);
  }
  for (let i = 0; i < segments; i += 1) {
    const next = (i + 1) % segments;
    const topA = 2 + i * 2;
    const bottomA = topA + 1;
    const topB = 2 + next * 2;
    const bottomB = topB + 1;
    if (cone) {
      indices.push(0, bottomA, bottomB);
    } else {
      indices.push(topA, bottomA, bottomB, topA, bottomB, topB);
      indices.push(0, topB, topA);
    }
    indices.push(1, bottomA, bottomB);
  }
  return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}

export function geometryForEntity(entity: EntitySpec): MeshData {
  switch (entity.type) {
    case "sphere":
      return createSphere(Number(entity.geometry.segments ?? 20), Number(entity.geometry.rings ?? 12));
    case "plane":
    case "text":
    case "hotspot":
    case "imageBillboard":
      return createPlane();
    case "cylinder":
      return createCylinder(Number(entity.geometry.segments ?? 24));
    case "cone":
      return createCylinder(Number(entity.geometry.segments ?? 24), true);
    case "box":
    default:
      return createBox();
  }
}

export function gridGeometry(size = 12, divisions = 12): MeshData {
  const vertices: number[] = [];
  const indices: number[] = [];
  let index = 0;
  for (let i = 0; i <= divisions; i += 1) {
    const offset = -size / 2 + (i / divisions) * size;
    vertices.push(-size / 2, 0, offset, size / 2, 0, offset, offset, 0, -size / 2, offset, 0, size / 2);
    indices.push(index, index + 1, index + 2, index + 3);
    index += 4;
  }
  return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}
