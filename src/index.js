/**
 * todo:
 *
 *  [x] Se baser sur l'heure de début des matchs pour commencer à crawler
 *  [x] Avertir un quart d'heure avant du début d'un match
 *  - Gérer le cas des prolongations
 *  - Gérer le cas de la séance de tir au but
 */
import cron from "cron";
import { map, reduce } from "lodash";

import Match from "./Match";

import { getNow, IS_DEV } from "./utils";
import { fetchLiveMatches, fetchMatchEvents, fetchMatches } from "./api";
import {
  handleMatchStartEvent,
  handleMatchEndEvent,
  handlePeriodEndEvent,
  handlePeriodStartEvent,
  handleCardEvent,
  handleGoalEvent,
  handlePenaltyEvent,
  handlePenaltyMissedEvent,
  handlePenaltySavedEvent,
  handleComingUpMatchEvent,
  handleVarEvent
} from "./events";

let matches = {};

const createMatch = data => {
  const match = new Match(data);

  match.on("matchStart", handleMatchStartEvent);
  match.on("matchEnd", handleMatchEndEvent);
  match.on("periodStart", handlePeriodStartEvent);
  match.on("periodEnd", handlePeriodEndEvent);
  match.on("goal", handleGoalEvent);
  match.on("penalty", handlePenaltyEvent);
  match.on("penalty missed", handlePenaltyMissedEvent);
  match.on("penalty saved", handlePenaltySavedEvent);
  match.on("card", handleCardEvent);
  match.on("var", handleVarEvent);

  return match;
};

const getComingUpMatches = () => {
  const now = getNow();

  return reduce(
    matches,
    (acc, match) => {
      const diff = Math.ceil(now.diff(match.getDate()) / 1000 / 60);

      if (diff >= -15 && diff < 0) {
        acc.push(match);
      }

      return acc;
    },
    []
  );
};

const checkComingUpMatches = () => {
  // On annonce les matchs à venir dans (environ) un quart d'heure
  const comingUpMatches = getComingUpMatches();

  comingUpMatches.forEach(match => {
    // Si l'annonce à déjà été faite on quitte
    if (match.getForecasted() === true) {
      return;
    }

    handleComingUpMatchEvent(match);
    match.setForecasted(true);
  });
};

// Cette fonction vérifie que les matchs qui sont supposés avoir commencé ont
// bien les données complètes ; c'est à dire qu'ils possèdent les données
// provenants de l'API `/live/football`, qui permet notamment de récupérer la
// liste des joueurs de chaque équipe. Sans quoi certains messages ne
// pourraient pas être contruits.
const checkUncompleteMatches = async () => {
  let shouldUpdate = false;

  map(matches, match => {
    // On active la mise à jour si le match à commencé et qu'il n'a pas encore toutes les données
    if (
      !match.isComplete() &&
      (match.isLive() || match.shouldHaveStarted(200))
    ) {
      shouldUpdate = true;
    }
  });

  if (shouldUpdate) {
    map(await fetchLiveMatches(), data => {
      matches[data.IdMatch].update(data);
    });
  }
};

const update = async () => {
  await checkComingUpMatches();
  await checkUncompleteMatches();

  // On parcourt ensuite la liste des matchs pour savoir s'il faut en récupérer
  // les évènements. Il faut que le match ait démarré et ait les données complètes
  map(matches, async match => {
    if (
      (match.isLive() || match.shouldHaveStarted(200)) &&
      match.isComplete()
    ) {
      const events = await fetchMatchEvents(match);
      match.updateEvents(events);
    }
  });
};

const init = async () => {
  // Récupération de tous les matchs de la compétition
  map(await fetchMatches(), data => {
    matches[data.IdMatch] = createMatch(data);
  });

  if (IS_DEV) {
    update();
    return;
  }

  cron
    .job(
      "*/15 * * * * *",
      () => {
        console.log("Update");
        update();
      },
      false
    )
    .start();

  console.log("Cron job started");
};

init();
