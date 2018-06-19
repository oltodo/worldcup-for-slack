/**
 * todo:
 *
 *  [x] Se baser sur l'heure de début des matchs pour commencer à crawler
 *  [x] Avertir un quart d'heure avant du début d'un match
 *  - Gérer le cas des prolongations
 *  - Gérer le cas de la séance de tir au but
 */
import requestify from "requestify";
import cron from "cron";
import { get, find, reduce } from "lodash";
import Queue from "better-queue";
import moment from "moment";

import Match from "./Match";

import {
  ID_COMPETITION,
  ENDPOINT_MATCHES,
  ENDPOINT_NOW,
  ENDPOINT_EVENTS,
  COUNTRIES
} from "./constants";

const IS_DEV = process.env.NODE_ENV === "development";

const SLACKHOOK =
  process.env.SLACKHOOK ||
  "https://hooks.slack.com/services/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";

const slackhook = require("slack-notify")(SLACKHOOK);

const cronJobTime = process.env.CRON_TIME || "*/15 * * * * *";

let matches = {};
let live = false;

const getNow = () => {
  return IS_DEV ? moment("2018-06-18T14:00") : moment();
};

const sendMessageQueue = new Queue(
  ({ match, event, msg }, done) => {
    const homeCountryId = get(match.getHomeTeam(), "IdCountry", "DEF");
    const homeCountryName = get(
      match.getHomeTeam(),
      "TeamName.0.Description",
      "Unknown"
    );

    const awayCountryId = get(match.getAwayTeam(), "IdCountry", "DEF");
    const awayCountryName = get(
      match.getAwayTeam(),
      "TeamName.0.Description",
      "Unknown"
    );
    // const groupName = get(match, "GroupName.0.Description");

    let text = `${homeCountryName} ${
      COUNTRIES[homeCountryId]["flag"]
    } / ${awayCountryName} ${COUNTRIES[awayCountryId]["flag"]}`;

    if (event) {
      const homeScore = get(event, "HomeGoals", 0);
      const awayScore = get(event, "AwayGoals", 0);

      text += ` *${homeScore}-${awayScore}*`;
    }

    // if (groupName) {
    //   text += ` (${groupName})`;
    // }

    text += `\n${msg}`;

    slackhook.send({
      text
    });

    done();
  },
  { afterProcessDelay: 1000 }
);

const handleMatchStartEvent = (match, event) => {
  console.log("New event: matchStart");

  sendMessageQueue.push({ match, event, msg: ":zap: *C'est parti !*" });
};

const handleMatchEndEvent = (match, event) => {
  console.log("New event: matchEnd");

  sendMessageQueue.push({
    match,
    event,
    msg: `:stopwatch: *Fin du match* (${event.MatchMinute})`
  });
};

const handleFirstPeriodEndEvent = (match, event) => {
  console.log("New event: firstPeriodEnd");

  sendMessageQueue.push({
    match,
    event,
    msg: `:toilet: *Fin de la première période* (${event.MatchMinute})`
  });
};

const handleSecondPeriodStartEvent = (match, event) => {
  console.log("New event: secondPeriodStart");

  sendMessageQueue.push({ match, event, msg: ":runner: *C'est reparti !*" });
};

const handleCardEvent = (match, event, team, type) => {
  console.log("New event: card");

  const player = find(team.Players, { IdPlayer: event.IdPlayer });
  const playerName = get(player, "ShortName.0.Description");

  let msg = "";

  switch (type) {
    // case "yellow":
    //   msg += ":large_orange_diamond: *Carton jaune*";
    //   break;
    case "red":
      msg += ":red_circle: *Carton rouge*";
      break;
    case "yellow+yellow":
      msg +=
        ":large_orange_diamond::large_orange_diamond: *Carton rouge* (deux jaunes)";
      break;
    default:
      return;
  }

  msg += ` pour ${playerName} ${COUNTRIES[team.IdCountry]["flag"]} (${
    event.MatchMinute
  })`;

  sendMessageQueue.push({
    match,
    event,
    msg
  });
};

const handleGoalEvent = (match, event, team, type) => {
  console.log("New event: goal");

  const player = find(team.Players, { IdPlayer: event.IdPlayer });
  const playerName = get(player, "ShortName.0.Description");
  const teamName = get(team, "TeamName.0.Description");

  let determiner = COUNTRIES[team.IdCountry]["determiner"];

  if (determiner === "le ") {
    determiner = "du ";
  } else {
    determiner = `de ${determiner}`;
  }

  let msg = `:soccer: *Goooooal!*`;
  msg += ` ${determiner}${teamName} ${
    COUNTRIES[team.IdCountry]["flag"]
  } (${playerName})`;

  switch (type) {
    case "freekick":
      msg += " sur coup-franc";
      break;
    case "penalty":
      msg += " sur penalty";
      break;
    case "own":
      msg += " contre sans camp :facepalm";
      break;
    default:
  }

  msg += ` (${event.MatchMinute})`;

  sendMessageQueue.push({ match, event, msg });
};

const handlePenaltyEvent = (match, event, team) => {
  console.log("New event: penalty");

  let realTeam;

  if (match.getHomeTeam()[team.IdTeam]) {
    realTeam = match.getAwayTeam();
  } else {
    realTeam = match.getHomeTeam();
  }

  const teamName = get(realTeam, "TeamName.0.Description");

  let msg = `:exclamation: *Penalty* accordé à ${
    COUNTRIES[team.IdCountry]["determiner"]
  }${teamName} (${event.MatchMinute})`;

  sendMessageQueue.push({ match, event, msg });
};

const handlePenaltyMissedEvent = (match, event, team, type) => {
  console.log("New event: penaltyMissed");

  let realTeam;

  if (match.getHomeTeam()[team.IdTeam]) {
    realTeam = match.getAwayTeam();
  } else {
    realTeam = match.getHomeTeam();
  }

  const teamName = get(realTeam, "TeamName.0.Description");

  let msg = `:no_good: *Penalty raté* par ${
    COUNTRIES[team.IdCountry]["determiner"]
  }${teamName} (${event.MatchMinute})`;

  sendMessageQueue.push({ match, event, msg });
};

const handleComingUpMatchEvent = match => {
  console.log("New event: comingUpMatch");

  const diff = Math.ceil(Math.abs(getNow().diff(match.getDate()) / 1000 / 60));

  let msg = `:soon: *Le match commence bientôt* (${diff} min) >> Pensez à vos pronos <<`;

  sendMessageQueue.push({ match, msg });
};

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

const getCurrentMatches = async () => {
  let results;

  if (IS_DEV) {
    results = require("../cache/now.json").Results;
  } else {
    console.log(`Fetching ${ENDPOINT_NOW}`);
    const response = await requestify.get(ENDPOINT_NOW);
    results = response.getBody().Results;
  }

  return results.filter(
    item => parseInt(item.IdCompetition, 10) === ID_COMPETITION
  );
};

const getMatchEvents = async match => {
  let results;

  if (IS_DEV) {
    results = require("../cache/events.json").Event;
  } else {
    const endpoint = ENDPOINT_EVENTS(match.getStageId(), match.getId());
    console.log(`Fetching ${endpoint}`);
    const response = await requestify.get(endpoint);
    results = response.getBody().Event;
  }

  return results;
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
    let currentMatches = await getCurrentMatches();

    if (currentMatches.length === 0) {
      live = false;
      return;
    }

    currentMatches.map(async data => {
      const match = matches[data.IdMatch];
      const events = await getMatchEvents(match);

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
  let results;

  if (IS_DEV) {
    results = require("../cache/matches.json").Results;
  } else {
    console.log(`Fetching ${ENDPOINT_MATCHES}`);
    const response = await requestify.get(ENDPOINT_MATCHES);
    results = response.getBody().Results;
  }

  matches = results.reduce((acc, data) => {
    matches[data.IdMatch] = createMatch(data);
    return matches;
  }, matches);

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
