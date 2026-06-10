# AGENTS.md

Richtlijnen voor coding agents die aan dit project werken.

## Projectdoel

AI Quest Engine 3D Lite is een browser-based editor plus standalone runtime export voor AI-ondersteunde 2D, 2.5D en 3D mini games, mini apps en quests.

De lange termijn is een volwassen game/app engine waarmee gebruikers met hulp van AI compacte, direct uitvoerbare interactieve webervaringen kunnen maken. AI moet creators helpen met scenes, assets, entity specs, materials, interacties, questlogica, flows, scoring en personalisatie.

De productvisie reageert op een bredere verschuiving op het web:

- Van trefwoorden naar intentie.
- Van links naar antwoorden, mini-apps en acties.
- Van SEO naar optimalisatie voor AI-systemen.
- Minder klikken naar websites.
- Meer belang voor autoriteit, originaliteit, betrouwbaarheid en directe uitvoerbaarheid.

Ontwerp en implementatie moeten dus niet alleen aan een klassieke editor denken, maar aan een engine die AI-systemen en eindgebruikers helpt intentie om te zetten in werkende mini games, mini apps en quests.

De belangrijkste invariant:

> De editor mag een SaaS-app zijn, maar de geexporteerde quest moet volledig zelfstandig als statisch browserpakket werken.

## Harde Constraints

- Gebruik geen externe game- of 3D-engines.
- Niet toevoegen: Three.js, Babylon.js, PlayCanvas, Phaser, PixiJS, Matter.js, Rapier, Cannon, Ammo of vergelijkbare engines.
- Rendering moet native browser APIs gebruiken:
  - WebGL2 als primaire MVP-renderer.
  - Canvas2D als eenvoudige fallback.
  - WebGPU alleen via een duidelijke toekomstige backend/stub.
- AI mag geen executable JavaScript genereren.
- AI-output mag alleen gevalideerde JSON specs zijn.
- De export runtime mag geen server, API key, database, auth, CDN, SaaS-host of eigen domein vereisen.
- De export moet werken als statische files, inclusief openen van `index.html`.

## Belangrijke Architectuurgrenzen

### Editor

Editorcode staat primair in:

```text
src/editor/components/
```

De editor mag:

- React state gebruiken.
- UI helpers en SaaS features bevatten.
- Later AI, auth, cloud storage of backend calls krijgen.
- AI-assisted authoring ondersteunen voor scenes, assets, logic, quest flows en spec repair.

De editor mag niet:

- Runtime-only aannames lekken naar geexporteerde quests.
- Exported quest gedrag afhankelijk maken van de dev server of SaaS-host.

### Engine

Enginecode staat in:

```text
src/engine/
```

Houd modules klein en expliciet:

- `quest/` voor schema, actions, conditions en quest runtime.
- `render/` voor renderer abstractions en native backends.
- `scene/` voor entities, transforms en serialization.
- `math/` voor vector/matrix primitives.
- `input/` voor pointer/keyboard/touch/picking.
- `export/` voor static bundle generation.

### Export Runtime

Exportcode staat in:

```text
src/engine/export/
```

Versie- en contractcode staat in:

```text
src/engine/version/
```

Bij wijzigingen aan export:

- Laat downloads via de Export Certification Layer lopen.
- Gebruik centrale constants uit `src/engine/version/EngineVersion.ts`; voeg geen losse version strings toe.
- Houd `RuntimeContract`, `ExportManifest`, compatibility checks en migraties synchroon.
- Gebruik `RendererFactory` voor rendererselectie; WebGL2 blijft export-default, WebGPU blijft experimenteel, Canvas2D/static fallback blijven beschikbaar.
- Update of voeg checks toe in `src/engine/export/certification/` als nieuwe runtime- of packagingrisico's ontstaan.
- Controleer dat `index.html` de quest spec embedt of anders nog steeds via `file://` werkt.
- Controleer dat `runtime.js` niet naar editor routes, SaaS hosts of externe APIs verwijst.
- Houd runtimecode zo klein mogelijk en quest-specifiek waar praktisch.
- Voeg geen dependency toe die alleen nodig is voor de editor aan de export runtime.

## Schema-first Werkwijze

Voor nieuwe quest/world features:

1. Breid Zod schemas uit in `src/engine/quest/`.
2. Update TypeScript types via de schema inference.
3. Update templates.
4. Update editor UI.
5. Update quest runtime.
6. Update export runtime.
7. Draai `npm run build`.

Voorkom ad-hoc objectvelden die niet door Zod gevalideerd worden.

Voor AI-assisted features geldt extra:

- AI mag alleen data voorstellen die in het schema past.
- Voeg nieuwe capabilities eerst toe aan de schema's voordat prompts, UI of runtime erop vertrouwen.
- Denk aan 2D, 2.5D en 3D als gelijkwaardige outputdoelen, niet alleen aan 3D scenes.

## UI Richtlijnen

- Houd de editor modern, premium en functioneel.
- Gebruik bestaande componentpatronen in `src/editor/components/`.
- Voorkom overlappende UI op desktop en mobile.
- Houd panels compact en scanbaar.
- Gebruik icon buttons voor duidelijke toolacties.
- Raw JSON blijft een advanced paneel, niet de primaire interface.
- Test na UI-wijzigingen minimaal desktop en een smalle viewport wanneer layout geraakt wordt.

## Renderer Richtlijnen

- Primary path: `WebGL2Renderer`.
- Houd `Renderer.ts` als backend-contract.
- Breid `Geometry.ts` uit voor nieuwe primitive types.
- Voeg renderer features toe zonder engine dependency.
- WebGPU werk hoort achter `WebGPURenderer` of een nieuwe backend, niet door WebGL2-code te vervangen zonder fallback.

## AI Richtlijnen

AI-gerelateerde code staat in:

```text
src/ai/
```

Regels:

- AI-output is JSON-only.
- Parse en valideer met `WorldSpecSchema`.
- Gebruik `RepairSpec.ts` of vergelijkbare validatie/repair flow.
- Geen AI-generated JavaScript uitvoeren of exporteren.
- AI mag helpen bij scenes, assets, material keuzes, interacties, conditions, actions, quest flows en scoring.
- AI mag uitleg, suggesties en gevalideerde specs geven, maar runtimegedrag blijft deterministic en schema-gedreven.
- AI-features moeten de export onafhankelijk houden van API keys, SaaS calls en netwerktoegang.

## Verificatie

Minimale check na codewijzigingen:

```bash
npm run build
```

Na export-, runtime- of certification-wijzigingen:

```bash
npm run test:exports
```

Deze Playwright-suite test de gegenereerde standalone packages, niet de editor UI. Hij moet zonder SaaS-backend, API routes, CDN of externe netwerkrequests draaien. Als Playwright lokaal nog geen browser heeft, installeer die buiten de codebase met `npx playwright install chromium`.

Na version/manifest/compatibility/migration wijzigingen:

```bash
npm run test
```

Voor UI/render/export wijzigingen:

```bash
npm run dev
```

Controleer in de browser:

- De editor laadt zonder console errors.
- WebGL2 viewport rendert zichtbaar.
- Entity selectie werkt.
- Quest click-actions geven runtime feedback.
- Export dialog opent en toont standalone files.
- Export certification toont pass/warn/fail met health report.
- Runtime contract, manifest compatibility en migration status zijn zichtbaar in export/validation UI.
- Export smoke-tests slagen voor de starter templates.
- Geldige templates komen door certificering zonder hard failures.
- Smalle viewport heeft geen horizontale overflow.

## Dependencybeleid

Nieuwe dependencies alleen toevoegen als ze duidelijk nodig zijn.

Toegestaan in principe:

- React/Vite/TypeScript tooling.
- Zod of schema-validatie.
- UI utility libraries.
- ZIP/download helpers voor export.

Niet toegestaan:

- Externe game engines.
- Externe 3D engines.
- Physics engines voor deze MVP.
- Runtime dependencies die standalone export netwerkafhankelijk maken.

## Build Output

`dist/` is gegenereerde output van Vite. Bewerk generated build output niet handmatig.

## Stijl

- TypeScript strict houden.
- Kleine, gerichte modules.
- Geen brede refactors zonder duidelijke noodzaak.
- Houd comments schaars en nuttig.
- Gebruik bestaande CSS/design tokens in `src/index.css`.
