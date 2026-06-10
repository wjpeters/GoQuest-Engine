import type { EntitySpec, InteractionSpec, WorldSpec } from "../../engine/quest/WorldSpec";

export function deepCloneSpec<T>(value: T): T {
  return structuredClone(value);
}

export function ensureUniqueId(baseId: string, existingIds: Iterable<string>) {
  const usedIds = new Set(existingIds);
  const safeBase = baseId.trim() || "item";
  if (!usedIds.has(safeBase)) {
    return safeBase;
  }

  let index = 2;
  let candidate = `${safeBase}-${index}`;
  while (usedIds.has(candidate)) {
    index += 1;
    candidate = `${safeBase}-${index}`;
  }
  return candidate;
}

export function updateEntityById(
  world: WorldSpec,
  entityId: string,
  updater: (entity: EntitySpec) => EntitySpec,
): WorldSpec {
  let found = false;
  const entities = world.entities.map((entity) => {
    if (entity.id !== entityId) {
      return entity;
    }
    found = true;
    return updater(deepCloneSpec(entity));
  });

  if (!found) {
    throw new Error(`Entity "${entityId}" was not found.`);
  }

  return { ...world, entities };
}

export interface RemovedEntityResult {
  world: WorldSpec;
  entity: EntitySpec;
  interactions: InteractionSpec[];
}

export function removeEntityById(world: WorldSpec, entityId: string): RemovedEntityResult {
  const entity = world.entities.find((item) => item.id === entityId);
  if (!entity) {
    throw new Error(`Entity "${entityId}" was not found.`);
  }

  const entityInteractionIds = new Set(entity.interactionIds);
  const removedInteractions = world.interactions.filter(
    (interaction) => interaction.targetEntityId === entityId || entityInteractionIds.has(interaction.id),
  );
  const removedInteractionIds = new Set(removedInteractions.map((interaction) => interaction.id));

  return {
    entity: deepCloneSpec(entity),
    interactions: deepCloneSpec(removedInteractions),
    world: {
      ...world,
      entities: world.entities
        .filter((item) => item.id !== entityId)
        .map((item) => ({
          ...item,
          interactionIds: item.interactionIds.filter((interactionId) => !removedInteractionIds.has(interactionId)),
        })),
      interactions: world.interactions.filter((interaction) => !removedInteractionIds.has(interaction.id)),
    },
  };
}

export function updateInteractionById(
  world: WorldSpec,
  interactionId: string,
  updater: (interaction: InteractionSpec) => InteractionSpec,
): WorldSpec {
  let found = false;
  const interactions = world.interactions.map((interaction) => {
    if (interaction.id !== interactionId) {
      return interaction;
    }
    found = true;
    return updater(deepCloneSpec(interaction));
  });

  if (!found) {
    throw new Error(`Interaction "${interactionId}" was not found.`);
  }

  return withSyncedInteractionRefs({ ...world, interactions }, interactionId);
}

export function withSyncedInteractionRefs(world: WorldSpec, interactionId: string): WorldSpec {
  const interaction = world.interactions.find((item) => item.id === interactionId);
  const entities = world.entities.map((entity) => ({
    ...entity,
    interactionIds: entity.interactionIds.filter((id) => id !== interactionId),
  }));

  if (!interaction?.targetEntityId) {
    return { ...world, entities };
  }

  return {
    ...world,
    entities: entities.map((entity) => {
      if (entity.id !== interaction.targetEntityId || entity.interactionIds.includes(interactionId)) {
        return entity;
      }
      return {
        ...entity,
        interactionIds: [...entity.interactionIds, interactionId],
      };
    }),
  };
}

export function removeInteractionById(world: WorldSpec, interactionId: string): WorldSpec {
  if (!world.interactions.some((interaction) => interaction.id === interactionId)) {
    throw new Error(`Interaction "${interactionId}" was not found.`);
  }

  return {
    ...world,
    interactions: world.interactions.filter((interaction) => interaction.id !== interactionId),
    entities: world.entities.map((entity) => ({
      ...entity,
      interactionIds: entity.interactionIds.filter((id) => id !== interactionId),
    })),
  };
}
