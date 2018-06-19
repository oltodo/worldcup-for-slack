import requestify from "requestify";
import cron from "cron";
import { get, find } from "lodash";
import Queue from "better-queue";

import Match from "./Match";

import {
  ID_COMPETITION,
  ENDPOINT_MATCHES,
  ENDPOINT_NOW,
  ENDPOINT_EVENTS,
  COUNTRIES
} from "./constants";

require("dotenv").config();

const IS_DEV = process.env.NODE_ENV === "development";

const SLACKHOOK = IS_DEV
  ? "https://hooks.slack.com/services/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"
  : process.env.SLACKHOOK;

const slackhook = require("slack-notify")(SLACKHOOK);

const cronJobTime = process.env.CRON_TIME || "*/10 * * * * *";

let matches = {};

const sendMessageQueue = new Queue(
  ({ match, event, msg }, done) => {
    const homeScore = get(event, "HomeGoals", 0);
    const homeCountryId = get(match, "HomeTeam.IdCountry", "DEF");
    const homeCountryName = get(
      match,
      "HomeTeam.TeamName.0.Description",
      "Unknown"
    );

    const awayScore = get(event, "AwayGoals", 0);
    const awayCountryId = get(match, "AwayTeam.IdCountry", "DEF");
    const awayCountryName = get(
      match,
      "AwayTeam.TeamName.0.Description",
      "Unknown"
    );
    // const groupName = get(match, "GroupName.0.Description");

    let text = `${homeCountryName} ${
      COUNTRIES[homeCountryId]["flag"]
    } / ${awayCountryName} ${
      COUNTRIES[awayCountryId]["flag"]
    } *${homeScore}-${awayScore}*`;

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

  let msg = ":collision:";

  switch (type) {
    // case "yellow":
    //   msg += "*Carton jaune*";
    //   break;
    case "red":
      msg += "*Carton rouge*";
      break;
    case "yellow+red":
      msg += "*Carton rouge* (deux jaunes)";
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

  let msg = `:soccer: *Goooooal!*`;
  msg += ` de ${COUNTRIES[team.IdCountry]["determiner"]}${teamName} ${
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

  if (match.HomeTeam[team.IdTeam]) {
    realTeam = match.AwayTeam;
  } else {
    realTeam = match.HomeTeam;
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

  if (match.HomeTeam[team.IdTeam]) {
    realTeam = match.AwayTeam;
  } else {
    realTeam = match.HomeTeam;
  }

  const teamName = get(realTeam, "TeamName.0.Description");

  let msg = `:no_good: *Penalty raté* par ${
    COUNTRIES[team.IdCountry]["determiner"]
  }${teamName} (${event.MatchMinute})`;

  sendMessageQueue.push({ match, event, msg });
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
    const response = await requestify.get(endpoint);
    results = response.getBody().Results;
  }

  return results;
};

const checkUpdates = async () => {
  let currentMatches = await getCurrentMatches();

  currentMatches.map(async data => {
    const match = matches[data.IdMatch];
    const events = await getMatchEvents(match);

    match.update(data);
    match.updateEvents(events);
  });
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
    const response = await requestify.get(ENDPOINT_MATCHES);
    results = response.getBody().Results;
  }

  matches = results.reduce((acc, data) => {
    matches[data.IdMatch] = createMatch(data);
    return matches;
  }, matches);

  cronJob.start();

  console.log("Cron job started");
};

init();
