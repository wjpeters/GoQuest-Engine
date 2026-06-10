# Export Certification

AI Quest Engine 3D Lite belooft dat geexporteerde quests standalone statische browserpakketten zijn. De Export Certification Layer bewaakt die belofte voordat een creator een package downloadt.

## Doel

Elke export moet aantonen dat hij:

- een valide `WorldSpec` bevat;
- geen editor-only code bevat;
- geen SaaS, backend, API, database, CDN, auth of eigen domein nodig heeft;
- via `file://` of generieke static hosting kan draaien;
- een valide manifest en machine-readable health report heeft;
- mobiel schaalbaar is;
- binnen bundlegrootte-budgetten blijft;
- minimaal een browser smoke-test doorstaat wanneer dat in de editor mogelijk is.

## Output

Een gecertificeerde export levert:

- export package files;
- `ExportHealthReport`;
- pass/warn/fail status;
- UI-samenvatting met checks;
- downloadbare health report JSON.

## Statusbeleid

| Status | Betekenis | Download |
| --- | --- | --- |
| `pass` | Alle harde en smoke checks zijn geslaagd. | Toegestaan |
| `warn` | Export is bruikbaar, maar er zijn aandachtspunten. | Toegestaan |
| `fail` | Standalone garantie is niet betrouwbaar. | Geblokkeerd |

Waarschuwingen blokkeren niet. Hard failures blokkeren ZIP en single HTML downloads totdat de oorzaak is opgelost.

## Checkgroepen

### Spec

- `worldspec_schema_valid`: valideert de huidige `WorldSpec` met Zod.
- `runtime_version_compatible`: controleert of de specversie door deze runtime wordt ondersteund.

### Runtime Independence

- `no_editor_imports`: zoekt naar editor-only modules, componentnamen en routes.
- `no_api_calls`: faalt op API/backend markers zoals `/api/`, XHR, WebSocket en app hosts.
- `no_external_network_requests`: faalt op externe scripts, fonts, afbeeldingen, analytics of webhooks.
- `works_without_webgpu`: controleert dat de runtime niet WebGPU-only is.

### Assets

- `assets_present`: elk asset in de spec moet ingebed zijn of in de package zitten.

### Portability

- `manifest_valid`: valideert manifeststructuur, build metadata, file list, capabilities en assets.
- `loads_from_file_possible`: single HTML moet quest JSON en runtime embedden voor `file://`.
- `loads_from_static_server`: package moet `index.html` en `runtime.js` met relatieve paden bevatten.
- `mobile_viewport_ready`: controleert viewport meta en responsive canvas sizing.

### Performance

- `first_render_budget`: gebruikt de browser smoke-test om eerste render te meten. Doel is 1500ms.
- `bundle_size_budget`: waarschuwing boven 5 MB, failure boven 20 MB.

### Smoke Test

- `no_console_errors`: faalt als runtime diagnostics fouten rapporteren tijdens load.
- `interaction_smoke_test`: voert de eerste click-interactie uit via een veilige runtime smoke hook.

## file:// vs static server

De ZIP bevat zowel:

- `index.html` plus `runtime.js` voor normale static hosting;
- `single.html` voor maximale `file://` compatibiliteit.

`single.html` embedt runtimecode en quest JSON. Dit voorkomt lokale fetch-problemen die veel browsers bij `file://` hebben.

## Manifest

Het manifest bevat:

- engine name;
- buildId;
- createdAt;
- runtimeVersion;
- specVersion;
- files met bytes en hashes;
- capabilities;
- asset list;
- standalone/network flags.

## Runtime diagnostics

De standalone runtime exposeert minimale lokale diagnostics:

```js
window.__AQE_RUNTIME_READY__
window.__AQE_EXPORT_HEALTH__
window.__AQE_SMOKE_CLICK_FIRST__
window.__AQE_TEST_HOOKS__
```

Deze markers zijn bedoeld voor lokale exportcertificering. Ze doen geen netwerkcalls en bevatten geen secrets.

## Playwright Export Smoke-tests

Draai de standalone export smoke-tests met:

```bash
npm run test:exports
```

De suite bouwt alle starter templates met `ExportBuilder`, schrijft ze naar tijdelijke directories, serveert ze via een lokale static server en opent de exports headless in Playwright. De tests controleren:

- vereiste package files en manifest;
- health report status `pass` of `warn`;
- runtime readiness via `window.__AQE_RUNTIME_READY__`;
- health diagnostics via `window.__AQE_EXPORT_HEALTH__`;
- WebGL2 of Canvas2D renderer;
- eerste render met zichtbaar canvas of runtime root;
- geen console errors of uncaught page errors;
- geen `/api/`, editor, SaaS, CDN, analytics of andere externe netwerkrequests;
- interaction smoke via `window.__AQE_TEST_HOOKS__.clickFirstInteraction()`;
- minimaal een mobile viewport van `390x844`;
- `single.html` via `file://` wanneer de Playwright/browseromgeving dit toestaat.

Als Playwright geen browserbinary vindt, installeer die buiten de codebase met:

```bash
npx playwright install chromium
```

Gebruik desgewenst `PLAYWRIGHT_CHANNEL=chrome npm run test:exports` om expliciet systeem-Chrome te gebruiken.

## Bekende beperkingen

- De statische inspecties zijn heuristisch. Ze zijn streng genoeg om duidelijke editor/API/netwerklekken te blokkeren, maar vervangen geen volledige security review.
- De smoke-test draait in de editorbrowser via een Blob URL. Als een browseromgeving iframe/WebGL beperkt, rapporteert de check waarschuwing of failure in plaats van een vals succes.
- De manifest hash van `manifest.json` zelf is gemarkeerd als `self`, omdat een manifest zijn eigen finale hash niet stabiel kan bevatten zonder extra packagingstap.
