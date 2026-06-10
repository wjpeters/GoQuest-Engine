export const ENGINE_NAME = "ai-quest-engine-3d-lite";
export const ENGINE_DISPLAY_NAME = "AI Quest Engine 3D Lite";
export const ENGINE_VERSION = "0.2.0";
export const RUNTIME_VERSION = "0.2.0";
export const SPEC_VERSION = "1.0.0";
export const EXPORT_FORMAT_VERSION = "1.0.0";
export const MIN_SUPPORTED_SPEC_VERSION = "1.0.0";
export const SUPPORTED_SPEC_VERSIONS = ["1.0.0"] as const;
export const SUPPORTED_EXPORT_FORMAT_VERSIONS = ["1.0.0"] as const;
export const BUILD_COMPATIBILITY_VERSION = "2026-06-runtime-contract-v1";

export type SupportedSpecVersion = (typeof SUPPORTED_SPEC_VERSIONS)[number];
export type SupportedExportFormatVersion = (typeof SUPPORTED_EXPORT_FORMAT_VERSIONS)[number];
