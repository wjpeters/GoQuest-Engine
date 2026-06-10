import { expect, test } from "@playwright/test";
import {
  AddEntityCommand,
  AddInteractionCommand,
  CommandManager,
  DeleteEntityCommand,
  UpdateInteractionCommand,
  UpdateTransformCommand,
} from "../src/editor/commands";
import { createEditorState } from "../src/editor/state/EditorState";
import type { EntitySpec, InteractionSpec } from "../src/engine/quest/WorldSpec";
import { CyberRiskRoom } from "../src/templates/CyberRiskRoom";

test("entity commands support add, undo, and redo", () => {
  const manager = createManager();
  const entity: EntitySpec = {
    id: "test-box",
    name: "Test Box",
    type: "box",
    transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    material: { color: "#7dd3fc", opacity: 1 },
    geometry: {},
    visible: true,
    selectable: true,
    interactionIds: [],
  };

  manager.execute(new AddEntityCommand(entity, { source: "hierarchy" }));

  expect(manager.getState().world.entities.some((item) => item.id === "test-box")).toBe(true);
  expect(manager.getState().selectedEntityId).toBe("test-box");

  manager.undo();
  expect(manager.getState().world.entities.some((item) => item.id === "test-box")).toBe(false);

  manager.redo();
  expect(manager.getState().world.entities.some((item) => item.id === "test-box")).toBe(true);
});

test("delete entity removes targeted interactions and undo restores them", () => {
  const manager = createManager();

  manager.execute(new DeleteEntityCommand("server", { source: "hierarchy" }));

  expect(manager.getState().world.entities.some((entity) => entity.id === "server")).toBe(false);
  expect(manager.getState().world.interactions.some((interaction) => interaction.id === "scan-server")).toBe(false);
  expect(
    manager.getState().world.entities.every((entity) => !entity.interactionIds.includes("scan-server")),
  ).toBe(true);

  manager.undo();

  expect(manager.getState().world.entities.some((entity) => entity.id === "server")).toBe(true);
  expect(manager.getState().world.interactions.some((interaction) => interaction.id === "scan-server")).toBe(true);
  expect(manager.getState().world.entities.find((entity) => entity.id === "server")?.interactionIds).toContain("scan-server");
});

test("transform edits merge when they happen within the merge window", () => {
  let now = 1_000;
  const manager = createManager(() => now);
  const originalPosition = manager.getState().world.entities.find((entity) => entity.id === "server")?.transform.position;

  manager.execute(new UpdateTransformCommand("server", { position: [1, 2, 3] }, { source: "inspector" }));
  now += 300;
  manager.execute(new UpdateTransformCommand("server", { position: [2, 3, 4] }, { source: "inspector" }));

  expect(manager.getSnapshot().history).toHaveLength(1);
  expect(manager.getState().world.entities.find((entity) => entity.id === "server")?.transform.position).toEqual([2, 3, 4]);

  manager.undo();
  expect(manager.getState().world.entities.find((entity) => entity.id === "server")?.transform.position).toEqual(originalPosition);

  manager.redo();
  expect(manager.getState().world.entities.find((entity) => entity.id === "server")?.transform.position).toEqual([2, 3, 4]);
});

test("interaction commands keep entity interaction refs synchronized", () => {
  const manager = createManager();
  const interaction: InteractionSpec = {
    id: "click-vault-extra",
    trigger: "click",
    targetEntityId: "vault",
    conditions: [],
    actions: [{ type: "showMessage", message: "Vault clicked.", tone: "info" }],
  };

  manager.execute(new AddInteractionCommand(interaction, { source: "flow" }));

  expect(manager.getState().world.interactions.some((item) => item.id === "click-vault-extra")).toBe(true);
  expect(manager.getState().world.entities.find((entity) => entity.id === "vault")?.interactionIds).toContain("click-vault-extra");

  manager.undo();

  expect(manager.getState().world.interactions.some((item) => item.id === "click-vault-extra")).toBe(false);
  expect(manager.getState().world.entities.find((entity) => entity.id === "vault")?.interactionIds).not.toContain("click-vault-extra");
});

test("command validation rejects broken interaction targets without changing state", () => {
  const manager = createManager();

  expect(() =>
    manager.execute(new UpdateInteractionCommand("scan-server", { targetEntityId: "missing-entity" }, { source: "flow" })),
  ).toThrow(/invalid editor state/i);

  expect(manager.getState().world.interactions.find((interaction) => interaction.id === "scan-server")?.targetEntityId).toBe("server");
});

function createManager(clock?: () => number) {
  const world = structuredClone(CyberRiskRoom);
  return new CommandManager(createEditorState(world, { selectedEntityId: "server" }), { clock });
}
