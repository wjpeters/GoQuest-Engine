# Renderer Capability System

AI Quest Engine 3D Lite uses a deterministic renderer policy for editor previews and exported quests.

## V1 Policy

- Primary renderer: WebGL2.
- Experimental renderer: WebGPU.
- Fallback renderer: Canvas2D.
- Last-resort fallback: static preview.

Customer exports default to WebGL2. WebGPU is not selected by default and must not be required for exports in V1. Canvas2D and static fallback are included so an export never becomes a blank page when a browser lacks WebGL2.

## RendererFactory

`src/engine/render/RendererFactory.ts` selects the first available backend that satisfies required features.

Default export policy:

```ts
prefer: ["webgl2", "canvas2d", "static"]
allowExperimental: false
fallbackMode: "degrade"
```

Editor preview policy can list WebGPU first, but `allowExperimental` remains false unless a future feature flag enables it.

## Features

World specs can declare renderer needs with `requiredCapabilities`:

```ts
requiredCapabilities: ["3d.primitives", "3d.picking", "materials.color", "materials.opacity"]
preferredRenderer: "webgl2"
allowRendererDegradation: true
```

Supported feature names include:

- `3d.primitives`
- `3d.lighting.basic`
- `3d.picking`
- `2d.labels`
- `materials.color`
- `materials.opacity`
- `assets.imageBillboard`
- `camera.orbit`
- `camera.perspective`
- `fallback.staticPreview`

## Fallback Behavior

If WebGL2 is unavailable, Canvas2D renders a simplified projected scene and still supports basic click interaction where possible.

If Canvas2D is unavailable too, static fallback renders a readable quest preview with title, description and visible entities. Static fallback is intentionally non-3D, but it keeps the export understandable and nonblank.

Fallbacks are explicit. Runtime diagnostics report selected backend, attempted backends, degradation status and warnings.

## Export Runtime

Standalone exports expose renderer diagnostics through:

```js
window.__AQE_EXPORT_HEALTH__.renderer
```

The export runtime supports renderer overrides for testing:

```text
?renderer=webgl2
?renderer=canvas2d
?renderer=static
```

WebGPU override is intentionally not enabled in exports.

## Certification

Export certification checks:

- `renderer_capabilities_declared`
- `required_renderer_features_supported`
- `webgl2_available_in_runtime`
- `canvas2d_fallback_available`
- `webgpu_not_required_for_export`
- `static_fallback_available`
- `degradation_policy_valid`

Certification fails if an export requires WebGPU or if required renderer features cannot be satisfied without a valid fallback. It warns when fallback reduces visual fidelity.

## Testing

Run renderer and contract tests:

```bash
npm run test
```

Run standalone export smoke-tests, including Canvas2D and static overrides:

```bash
npm run test:exports
```
