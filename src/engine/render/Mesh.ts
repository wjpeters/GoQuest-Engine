export interface MeshData {
  vertices: Float32Array;
  indices: Uint16Array;
}

export class Mesh {
  constructor(public data: MeshData) {}
}
