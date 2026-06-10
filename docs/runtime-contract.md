# Versioned Runtime Contract

AI Quest Engine 3D Lite exports are standalone packages. Each package carries the runtime it needs, plus a manifest that explains exactly which spec, runtime and export format it was built for.

## Version Fields

The central version constants live in `src/engine/version/EngineVersion.ts`:

- `ENGINE_NAME`
- `ENGINE_DISPLAY_NAME`
- `ENGINE_VERSION`
- `RUNTIME_VERSION`
- `SPEC_VERSION`
- `EXPORT_FORMAT_VERSION`
- `MIN_SUPPORTED_SPEC_VERSION`
- `SUPPORTED_SPEC_VERSIONS`
- `SUPPORTED_EXPORT_FORMAT_VERSIONS`
- `BUILD_COMPATIBILITY_VERSION`

Use these constants instead of hardcoded version strings in export, runtime, manifest, tests and docs-adjacent code.

## Runtime Contract

`src/engine/version/RuntimeContract.ts` defines `RuntimeContract` and `RuntimeContractSchema`.

The current contract declares:

- engine identity;
- runtime version;
- supported spec versions;
- supported export format versions;
- renderer capabilities;
- renderer default/fallback policy;
- geometry, asset, action, condition and interaction capabilities;
- supported export modes;
- diagnostics global names.

Exports expose this contract at runtime:

```js
window.__AQE_RUNTIME_CONTRACT__
window.__AQE_RUNTIME_READY__
window.__AQE_EXPORT_HEALTH__
window.__AQE_TEST_HOOKS__
```

The health object includes runtime version, spec version, export format version, selected renderer and compatibility issues. These globals are static, local-only diagnostics and must not call any backend.

## Export Manifest

The export manifest is validated by `ExportManifestSchema` in `src/engine/export/BundleManifest.ts`.

Required manifest metadata includes:

- engine and engine version;
- runtime version;
- spec version;
- export format version;
- build id and creation time;
- source template id when known;
- runtime contract;
- renderer policy and fallback modes;
- compatibility result;
- migration summary;
- files with byte size, hash and role;
- asset metadata;
- standalone/network flags.

The manifest is meant to be machine-readable by future editor versions and migration tools.

## Compatibility Policy

Patch versions should not break existing exports or project specs.

Minor versions may add capabilities, but should keep old spec support where reasonable.

Major versions may require migrations.

Exported packages carry their own runtime, so old exports remain playable even if the SaaS editor changes. The future editor does not need to run old exports with a new runtime. It does need to load old project specs through migrations before editing or re-exporting.

Compatibility checks live in `src/engine/version/Compatibility.ts` and verify:

- WorldSpec spec version support;
- export format support;
- required capabilities;
- used renderer/entity/asset/action/condition/interaction capabilities;
- manifest contract validity.

Incompatible specs must block export download. Warnings can allow export when the package remains standalone and understandable.

## Migration Policy

Migration infrastructure lives in `src/engine/version/migrations/`.

Current behavior:

- current `1.0.0` specs use identity migration;
- specs without `specVersion` are treated as legacy `0.0.0`;
- legacy `0.0.0` specs are stamped to `1.0.0` when safe and produce a warning;
- unknown versions without a registered migration fail explicitly.

Future migrations should be small, deterministic functions registered with:

```ts
registerMigration("1.0.0", "1.1.0", (spec) => ({
  ...spec,
  specVersion: "1.1.0",
}));
```

Migrations should not add backend dependencies or executable JavaScript.

## What Breaks Compatibility

Compatibility is broken when a spec or manifest requires something the bundled runtime cannot provide, for example:

- unsupported spec version;
- unsupported export format version;
- required capability missing from the runtime contract;
- unknown action, condition, interaction trigger, asset type or entity type;
- manifest contract that does not validate;
- editor/SaaS/API/CDN dependency in the standalone package.

## Verification

Run contract tests:

```bash
npm run test
```

Run standalone export smoke-tests:

```bash
npm run test:exports
```

Run the production build:

```bash
npm run build
```
