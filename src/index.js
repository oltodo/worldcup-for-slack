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

const getNow = () => {
  return IS_DEV ? moment("2018-06-18T14:00") : moment();
};

const sendMessageQueue = new Queue(
  ({ match, event, msg, attachments = [] }, done) => {
    const homeTeam = match.getHomeTeam();
    const awayTeam = match.getAwayTeam();

    let text = ``;

    if (event) {
      const homeScore = get(event, "HomeGoals", 0);
      const awayScore = get(event, "AwayGoals", 0);

      text += ` ${homeTeam.getName(true)} *${homeScore}-${awayScore}* ${awayTeam.getName(true,true)} `;
    }
    
    text += `\n${msg}`;

    slackhook.send({
      text,
      attachments
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

  const playerName = team.getPlayerName(event.IdPlayer);

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

  msg += ` pour ${playerName} ${team.getFlag()} (${event.MatchMinute})`;

  sendMessageQueue.push({
    match,
    event,
    msg
  });
};

const handleOwnGoalEvent = (match, event, team) => {
  const oppTeam = match.getOppositeTeam(team);

  const msg = `:soccer: *Goooooal! pour ${oppTeam.getNameWithDeterminer(
    null,
    true
  )}* (${event.MatchMinute})`;

  const attachments = [
    {
      text: `${team.getPlayerName(
        event.IdPlayer,
        true
      )} marque contre son camp :face_palm:`,
      color: "danger",
      actions: [
        {
          type: "button",
          text: ":tv: Accéder au live",
          url: "http://neosportek.blogspot.com/p/world-cup.html"
        }
      ]
    }
  ];

  sendMessageQueue.push({ match, event, msg, attachments });
};

const handleGoalEvent = (match, event, team, type) => {
  console.log("New event: goal");

  if (type === "own") {
    handleOwnGoalEvent(match, event, team);
    return;
  }

  const playerName = team.getPlayerName(event.IdPlayer);

  const msg = `:soccer: *Goooooal! pour ${team.getNameWithDeterminer(
    null,
    true
  )}* (${event.MatchMinute})`;

  let attachments = [];

  switch (type) {
    case "freekick":
      attachments.push({
        text: `But de ${playerName} sur coup-franc`
      });
      break;
    case "penalty":
      attachments.push({
        text: `But de ${playerName} sur penalty`
      });
      break;
    default:
      attachments.push({
        text: `But de ${playerName}`
      });
  }

  attachments[0].color = "good";
  attachments[0].actions = [
    {
      type: "button",
      text: ":tv: Accéder au live",
      url: "http://neosportek.blogspot.com/p/world-cup.html"
    }
  ];

  sendMessageQueue.push({ match, event, msg, attachments });
};

const handlePenaltyEvent = (match, event, team) => {
  console.log("New event: penalty");

  const oppTeam = match.getOppositeTeam(team);

  let msg = `:exclamation: *Penalty* accordé ${oppTeam.getNameWithDeterminer(
    "à",
    true
  )} (${event.MatchMinute})`;

  sendMessageQueue.push({ match, event, msg });
};

const handlePenaltyMissedEvent = (match, event, team, type) => {
  console.log("New event: penaltyMissed");

  const oppTeam = match.getOppositeTeam(team);

  let msg = `:no_good: *Penalty raté* par ${oppTeam.getNameWithDeterminer(
    null,
    true
  )} (${event.MatchMinute})`;

  sendMessageQueue.push({ match, event, msg });
};

const handleComingUpMatchEvent = match => {
  console.log("New event: comingUpMatch");

  const diff = Math.ceil(Math.abs(getNow().diff(match.getDate()) / 1000 / 60));

  const msg = `:soon: *Le match commence bientôt* (${diff} min)`;

  const attachments = [
    {
      title: ">> Pensez à vos pronos <<",
      title_link: "https://www.monpetitprono.com/forecast/matches-to-come"
    }
  ];

  sendMessageQueue.push({ match, msg, attachments });
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
