import Queue from "better-queue";
import { get } from "lodash";

import { getNow } from "./utils";
import {
  PERIOD_PENALTIES,
  EVENT_PENALTY_GOAL,
  EVENT_PENALTY_MISSED,
  EVENT_PENALTY_SAVED,
  PENALTY_OK,
  PENALTY_NOK,
  PENALTY_INCOMING,
  PERIOD_1ST_HALF,
  PERIOD_2ND_HALF,
  PERIOD_EXPAND_1ST_HALF,
  PERIOD_EXPAND_2ND_HALF,
  EVENT_MATCH_END,
  EVENT_PERIOD_END,
  EVENT_PERIOD_START
} from "./constants";

const SLACKHOOK =
  process.env.SLACKHOOK ||
  "https://hooks.slack.com/services/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";

const slackhook = require("slack-notify")(SLACKHOOK);

const liveAttachment = [
  {
    type: "button",
    text: ":tv: Accéder au live",
    url: "http://neosportek.blogspot.com/p/world-cup.html"
  }
];

const getPeriodName = periodId => {
  let periodNumberName = "";

  switch (periodId) {
    case PERIOD_1ST_HALF:
      periodNumberName = "première période";
      break;
    case PERIOD_2ND_HALF:
      periodNumberName = "seconde période";
      break;
    case PERIOD_EXPAND_1ST_HALF:
      periodNumberName = "première période de prolongation";
      break;
    case PERIOD_EXPAND_2ND_HALF:
      periodNumberName = "seconde période de prolongation";
      break;
    case PERIOD_PENALTIES:
      periodNumberName = "séance de tirs au but";
      break;
    default:
  }
  return periodNumberName;
};

const buildPenaltiesSeriesScore = data => {
  let doneShootsString = "";
  let remainingShoots = 5;

  if (data) {
    remainingShoots =
      data.length <= remainingShoots ? remainingShoots - data.length : 0;
    doneShootsString = data.reduce(
      (acc, event) =>
        acc + (EVENT_PENALTY_GOAL === event.Type ? PENALTY_OK : PENALTY_NOK),
      ""
    );
  }

  const remainingShootsString = new Array(remainingShoots)
    .fill(1)
    .reduce(acc => acc + PENALTY_INCOMING, "");
  return doneShootsString + remainingShootsString;
};

const buildPenaltiesSeriesMessage = match => {
  console.log("events during tirs au but");
  const homeTeam = match.getHomeTeam();
  const awayTeam = match.getAwayTeam();
  let text = "";

  const homeGoalPenalties = match.getEvents({
    eventTypes: [EVENT_PENALTY_GOAL, EVENT_PENALTY_MISSED, EVENT_PENALTY_SAVED],
    period: PERIOD_PENALTIES,
    teamId: homeTeam.getId()
  });
  const awayGoalPenalties = match.getEvents({
    eventTypes: [EVENT_PENALTY_GOAL, EVENT_PENALTY_MISSED, EVENT_PENALTY_SAVED],
    period: PERIOD_PENALTIES,
    teamId: awayTeam.getId()
  });
  const homeGoalPenaltiesString = buildPenaltiesSeriesScore(homeGoalPenalties);
  const awayGoalPenaltiesString = buildPenaltiesSeriesScore(awayGoalPenalties);
  text += `\n ${homeTeam.getName(true)} \n  [${homeGoalPenaltiesString}]`;
  text += `\n ${awayTeam.getName(true)} \n  [${awayGoalPenaltiesString}]`;

  return text;
};

const sendMessageQueue = new Queue(
  ({ match, event, msg, attachments = [] }, done) => {
    const homeTeam = match.getHomeTeam();
    const awayTeam = match.getAwayTeam();
    let text = `${homeTeam.getName(true)} / ${awayTeam.getName(true)}`;

    if (event) {
      const matchFinished =
        EVENT_MATCH_END === event.Type ||
        (PERIOD_PENALTIES === event.Period && EVENT_PERIOD_END === event.Type);

      const homeScore = get(event, "HomeGoals", 0);
      const awayScore = get(event, "AwayGoals", 0);

      text = ` ${homeTeam.getName(
        true
      )} *${homeScore}-${awayScore}* ${awayTeam.getName(true, true)} `;

      //Si tirs aux buts l'affichage change
      if (PERIOD_PENALTIES === event.Period && !matchFinished) {
        const penaltiesSeriesString = buildPenaltiesSeriesMessage(match);
        attachments.push({ text: penaltiesSeriesString });
        msg = EVENT_PERIOD_START === event.Type ? msg : "";
      }

      if (matchFinished) {
        let victoryTeam = homeTeam;

        if (
          (homeScore === awayScore &&
            event.HomePenaltyGoals < event.AwayPenaltyGoals) ||
          homeScore < awayScore
        ) {
          victoryTeam = awayTeam;
        }
        if (
          homeScore === awayScore &&
          event.HomePenaltyGoals === event.AwayPenaltyGoals
        ) {
          victoryTeam = null;
        }
        console.log("victoire");
        text += victoryTeam
          ? `\n Victoire de ${victoryTeam.getName(true)}`
          : `\n Match nul`;
      }
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

export const handleMatchStartEvent = (match, event) => {
  console.log("New event: matchStart");

  sendMessageQueue.push({ match, event, msg: ":zap: *C'est parti !*" });
};

export const handleMatchEndEvent = (match, event) => {
  console.log("New event: matchEnd");

  sendMessageQueue.push({
    match,
    event,
    msg: `:stopwatch: *Fin du match*`
  });
};

export const handlePeriodEndEvent = (match, event) => {
  console.log("New event: firstPeriodEnd");

  const periodName = getPeriodName(event.Period);
  sendMessageQueue.push({
    match,
    event,
    msg: `:toilet: *Fin de la ${periodName} * (${event.MatchMinute})`
  });

  if (PERIOD_PENALTIES === event.Period) {
    handleMatchEndEvent(match, event);
  }
};

export const handlePeriodStartEvent = (match, event) => {
  console.log("New event: secondPeriodStart");
  const periodName = getPeriodName(event.Period);
  sendMessageQueue.push({
    match,
    event,
    msg: `:runner: *Debut de la ${periodName} `
  });
};

export const handleCardEvent = (match, event, team, type) => {
  console.log("New event: card");

  const playerName = team.getPlayerName(event.IdPlayer);

  let msg = "";

  switch (type) {
    case "yellow":
      msg += ":large_orange_diamond: *Carton jaune*";
      break;
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

export const handleOwnGoalEvent = (match, event, team) => {
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
      actions: liveAttachment
    }
  ];

  sendMessageQueue.push({ match, event, msg, attachments });
};

export const handleGoalEvent = (match, event, team, type) => {
  console.log("New event: goal");

  if (type === "own") {
    handleOwnGoalEvent(match, event, team);
    return;
  }

  const playerName = team.getPlayerName(event.IdPlayer);
  const playerFlag = team.getFlag();

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
        text:
          PERIOD_PENALTIES === event.Period
            ? `But de ${playerName} ${playerFlag} sur penalty`
            : `But de ${playerName} sur penalty`
      });
      break;
    default:
      attachments.push({
        text: `But de ${playerName}`
      });
  }

  attachments[0].color = "good";
  attachments[0].actions = liveAttachment;

  sendMessageQueue.push({ match, event, msg, attachments });
};

export const handlePenaltyEvent = (match, event, team) => {
  console.log("New event: penalty");

  const oppTeam = match.getOppositeTeam(team);

  let msg = `:exclamation: *Penalty* accordé ${oppTeam.getNameWithDeterminer(
    "à",
    true
  )} (${event.MatchMinute})`;

  sendMessageQueue.push({ match, event, msg });
};

export const handlePenaltyMissedEvent = (match, event, team) => {
  console.log("New event: penaltyMissed");

  let msg = `:no_good: *${team.getPlayerName(
    event.IdPlayer,
    true
  )} manque son penalty* (${event.MatchMinute})`;

  sendMessageQueue.push({ match, event, msg });
};

export const handlePenaltySavedEvent = (match, event, team) => {
  console.log("New event: penaltySaved");

  const gardien = match.getOppositeTeam(team).getPlayerName(event.IdSubPlayer);
  const gardienFlag = match.getOppositeTeam(team).getFlag();

  let msg = `:no_good: *Penalty raté* par ${team.getNameWithDeterminer(
    null,
    true
  )} (${event.MatchMinute})`;

  const playerName = team.getPlayerName(event.IdPlayer);
  const playerFlag = team.getFlag();
  const attachments = [
    {
      text: `Tir de ${playerName} ${playerFlag} arrêté par le gardien ${gardien} ${gardienFlag}`,
      color: "danger",
      actions: liveAttachment
    }
  ];

  sendMessageQueue.push({ match, event, msg, attachments });
};

export const handleComingUpMatchEvent = match => {
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
