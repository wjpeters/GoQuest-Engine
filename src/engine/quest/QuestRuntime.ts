import type { EventBus } from "../core/EventBus";
import type { WorldSpec } from "./WorldSpec";
import type { ActionSpec } from "./Actions";
import { evaluateConditions } from "./Conditions";
import { QuestEvents } from "./Events";
import { findBestOutcome } from "./Scoring";

export interface QuestRuntimeMessage {
  title?: string;
  message: string;
  tone: "info" | "success" | "warning";
}

export class QuestRuntime {
  readonly world: WorldSpec;
  readonly events?: EventBus;
  currentMessage?: QuestRuntimeMessage;
  completed = false;
  outcomeId?: string;

  constructor(world: WorldSpec, events?: EventBus) {
    this.world = structuredClone(world);
    this.events = events;
  }

  start() {
    this.handleTrigger("sceneStart");
  }

  handleTrigger(trigger: "click" | "hover" | "enterZone" | "sceneStart", targetEntityId?: string) {
    const matches = this.world.interactions.filter((interaction) => {
      const targetMatches = !interaction.targetEntityId || interaction.targetEntityId === targetEntityId;
      return interaction.trigger === trigger && targetMatches;
    });

    for (const interaction of matches) {
      const canRun = evaluateConditions(interaction.conditions, {
        variables: this.world.quest.variables,
        score: this.world.quest.score,
        currentStage: this.world.quest.currentStage,
      });

      if (canRun) {
        interaction.actions.forEach((action) => this.applyAction(action));
      }
    }
  }

  applyAction(action: ActionSpec) {
    switch (action.type) {
      case "setVariable":
        this.world.quest.variables[action.variable] = action.value;
        break;
      case "incrementVariable": {
        const current = this.world.quest.variables[action.variable];
        this.world.quest.variables[action.variable] = (typeof current === "number" ? current : 0) + action.amount;
        break;
      }
      case "addScore":
        this.world.quest.score += action.amount;
        break;
      case "showMessage":
        this.currentMessage = {
          title: action.title,
          message: action.message,
          tone: action.tone,
        };
        this.events?.emit(QuestEvents.message, this.currentMessage);
        break;
      case "highlightEntity": {
        const entity = this.world.entities.find((item) => item.id === action.entityId);
        if (entity) {
          entity.material.emissive = action.color;
          entity.material.color = action.color;
        }
        break;
      }
      case "hideEntity": {
        const entity = this.world.entities.find((item) => item.id === action.entityId);
        if (entity) {
          entity.visible = false;
        }
        break;
      }
      case "showEntity": {
        const entity = this.world.entities.find((item) => item.id === action.entityId);
        if (entity) {
          entity.visible = true;
        }
        break;
      }
      case "moveCamera":
        this.world.camera.position = action.position;
        this.world.camera.target = action.target;
        break;
      case "gotoStage":
        this.world.quest.currentStage = action.stageId;
        this.events?.emit(QuestEvents.stageChanged, action.stageId);
        break;
      case "completeQuest": {
        this.completed = true;
        const outcome = action.outcomeId ?? findBestOutcome(this.world.quest)?.id;
        this.outcomeId = outcome;
        this.events?.emit(QuestEvents.completed, outcome);
        break;
      }
    }

    this.events?.emit(QuestEvents.actionApplied, action);
    this.events?.emit(QuestEvents.worldChanged, this.world);
  }
}
