# AI Quest Engine 3D Lite

Browser-based editor en standalone runtime export voor lichte 2D/3D interactieve quests.

Dit project is een eerste werkende MVP voor een inhouse SaaS-editor waarmee creators schema-gedreven quest-werelden kunnen bouwen, previewen en exporteren. De export is bedoeld als volledig statisch browserpakket dat los van de editor draait.

## Productmodel

Er zijn twee lagen:

1. **Editor App**
   - React/Vite webapp voor authoring, preview, validatie en export.
   - Mag later SaaS-services, AI, auth en cloud storage gebruiken.
   - AI-output hoort JSON-only te zijn en wordt gevalideerd voor gebruik.

2. **Export Runtime**
   - Statische runtime die met de quest wordt gebundeld.
   - Draait door `index.html` te openen of door de files op een statische webserver te hosten.
   - Vereist geen API keys, server calls, database, auth, CDN, SaaS-runtime of eigen domein.
   - Bevat alleen minimale runtimecode voor de geexporteerde quest.

## Tech Stack

- TypeScript
- React
- Vite
- Zod
- Tailwind CSS
- Native WebGL2 renderer
- Canvas2D fallback
- WebGPU stub voor latere uitbreiding
- JSZip voor browser-side ZIP export
- Lucide React icons

Belangrijk: dit project gebruikt geen externe 3D/game engines zoals Three.js, Babylon.js, PlayCanvas, Phaser, PixiJS, Matter.js, Rapier, Cannon, Ammo, enzovoort.

## Quickstart

```bash
npm install
npm run dev
```

Open daarna:

```text
http://127.0.0.1:5173/
```

Productiebuild:

```bash
npm run build
```

Preview van de productiebuild:

```bash
npm run preview
```

## Scripts

| Script | Doel |
| --- | --- |
| `npm run dev` | Start Vite dev server op `127.0.0.1`. |
| `npm run build` | Draait TypeScript checks en bouwt de Vite app. |
| `npm run preview` | Serveert de production build lokaal. |

## Projectstructuur

```text
src/
  ai/                 Mock AI JSON generation en spec repair helpers.
  editor/components/  Editor UI: shell, toolbar, viewport, inspector, panels, export dialog.
  engine/
    animation/        Tween en timeline primitives.
    core/             Engine loop, clock, event bus, resource manager.
    export/           Static export builder en runtime template.
    input/            Pointer, keyboard, touch en picking helpers.
    math/             Vec2, Vec3, Mat4, Quat, Ray, Bounds.
    quest/            World/quest schemas, actions, conditions, runtime, scoring.
    render/           Renderer interface, WebGL2 backend, Canvas2D fallback, WebGPU stub.
    scene/            Entity, transform, scene en serializer.
  templates/          Starter quest templates.
```

## Editor Features

- Premium donkere SaaS-layout met toolbar, linker sidebar, centrale viewport en rechter inspector.
- WebGL2 scene preview met primitieve 3D entity types.
- Scene hierarchy met visibility toggles.
- Inspector voor transform, materiaal, visibility, selectability en labels.
- Quest flow panel met interactions, triggers, conditions en actions.
- Quest state panel met score, stages en outcomes.
- Asset panel voor toekomstige embedded references.
- Advanced JSON panel met Zod-validatie.
- Export dialog met ZIP download.
- Responsive layout voor desktop en mobile widths.

## Quest Schema

De centrale contracts staan in:

- `src/engine/quest/WorldSpec.ts`
- `src/engine/quest/QuestSpec.ts`
- `src/engine/quest/Actions.ts`
- `src/engine/quest/Conditions.ts`

Een `WorldSpec` bevat onder andere:

- metadata en viewport settings
- environment en camera
- entities
- interactions
- quest state
- assets
- export settings

AI of editor tooling mag alleen gevalideerde JSON specs produceren. AI mag geen uitvoerbare JavaScript genereren.

## Renderer

De primaire renderer is native WebGL2:

- `src/engine/render/WebGL2Renderer.ts`
- `src/engine/render/Geometry.ts`
- `src/engine/render/ShaderProgram.ts`

Fallback en toekomstpad:

- `Canvas2DRenderer.ts` voor eenvoudige fallback.
- `WebGPURenderer.ts` als stub voor latere implementatie.

## Standalone Export

De exportlogica staat in:

- `src/engine/export/ExportBuilder.ts`
- `src/engine/export/StaticRuntimeTemplate.ts`
- `src/engine/export/BundleManifest.ts`

De export bevat:

```text
index.html
runtime.js
manifest.json
quest-spec.json
```

`index.html` embedt de quest JSON zodat openen via `file://` geen fetch naar een lokale JSON file nodig heeft. `runtime.js` bevat de minimale standalone spelerlogica.

## Templates

Beschikbare templates:

- Cyber Risk Room
- Product Configurator Lite
- Decision Quest 3D

Zie `src/templates/`.

## Development Notes

- Houd editor en export runtime gescheiden.
- Breid schemas eerst uit voordat editor/runtime gedrag afhankelijk wordt van nieuwe velden.
- Houd de export runtime standalone en netwerkvrij.
- Voeg geen externe game/3D engine dependency toe.
- Draai minimaal `npm run build` na codewijzigingen.
