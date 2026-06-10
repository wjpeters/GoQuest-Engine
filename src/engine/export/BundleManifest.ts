export interface BundleManifest {
  engine: "ai-quest-engine-3d-lite";
  buildId: string;
  runtimeVersion: string;
  specVersion: string;
  createdAt: string;
  files: Array<{
    path: string;
    bytes: number;
    hash: string;
  }>;
  capabilities: {
    renderers: Array<"webgl2" | "canvas2d" | "webgpu">;
    fileMode: boolean;
    staticServer: boolean;
    embeddedQuestSpec: boolean;
    networkRequired: false;
  };
  assets: Array<{
    id: string;
    name: string;
    type: string;
    embedded: boolean;
    uri: string;
  }>;
  standalone: true;
  requiresNetwork: false;
}
