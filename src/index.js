/**
 * todo:
 *
 *  [x] Se baser sur l'heure de début des matchs pour commencer à crawler
 *  [x] Avertir un quart d'heure avant du début d'un match
 *  - Gérer le cas des prolongations
 *  - Gérer le cas de la séance de tir au but
 */
import cron from "cron";
import { reduce } from "lodash";

import Match from "./Match";

import { getNow, IS_DEV } from "./utils";
import { fetchCurrentMatches, fetchMatchEvents, fetchMatches } from "./api";
import {
  handleMatchStartEvent,
  handleMatchEndEvent,
  handleFirstPeriodEndEvent,
  handleSecondPeriodStartEvent,
  handleCardEvent,
  handleGoalEvent,
  handlePenaltyEvent,
  handlePenaltyMissedEvent,
  handleComingUpMatchEvent
} from "./events";

const cronJobTime = process.env.CRON_TIME || "*/15 * * * * *";

let matches = {};
let live = false;

const createMatch = data => {
  const match = new Match(data);

  match.on("matchStart", handleMatchStartEvent);
  match.on("matchEnd", handleMatchEndEvent);
  match.on("firstPeriodEnd", handleFirstPeriodEndEvent);
  match.on("secondPeriodStart", handleSecondPeriodStartEvent);
  match.on("goal", handleGoalEvent);
  match.on("penalty", handlePenaltyEvent);
  match.on("penalty missed", handlePenaltyMissedEvent);
  match.on("card", handleCardEvent);

  return match;
};

const hasStartedMatch = from => {
  const now = getNow();

  return reduce(
    matches,
    (acc, match) => {
      const diff = Math.floor(now.diff(match.getDate()) / 1000 / 60);

      if (diff >= 0 && diff < from) {
        return true;
      }

      return acc;
    },
    false
  );
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

const checkUpdates = async () => {
  // On annonce les matchs à venir dans (environ) un quart d'heure
  getComingUpMatches().forEach(match => {
    if (match.getForecasted() === true) {
      return;
    }

    handleComingUpMatchEvent(match);
    match.setForecasted(true);
  });

  if (live === true) {
    let currentMatches = await fetchCurrentMatches();

    if (currentMatches.length === 0) {
      live = false;
      return;
    }

    currentMatches.map(async data => {
      const match = matches[data.IdMatch];
      const events = await fetchMatchEvents(match);

      match.update(data);
      match.updateEvents(events);
    });

    return;
  }

  live = hasStartedMatch(10);
};

const cronJob = cron.job(
  cronJobTime,
  () => {
    console.log("Cron execution");
    checkUpdates();
  },
  false
);

const init = async () => {
  matches = reduce(
    await fetchMatches(),
    (acc, data) => {
      matches[data.IdMatch] = createMatch(data);
      return matches;
    },
    matches
  );

  // On regarde quelles sont la date et l'heure du prochain match pour commencer le crawl.
  // Cela évite de crawler à des moments où rien ne se passe.
  live = hasStartedMatch(200);

  if (IS_DEV) {
    checkUpdates();
  } else {
    cronJob.start();
  }

  console.log("Cron job started");
};

init();
