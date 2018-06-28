import Queue from "better-queue";
import { get, range } from "lodash";

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

  const remainingShootsString = range(remainingShoots).reduce(
    acc => acc + PENALTY_INCOMING,
    ""
  );
  return doneShootsString + remainingShootsString;
};

const buildPenaltiesSeriesfields = (match, time) => {
  const homeTeam = match.getHomeTeam();
  const awayTeam = match.getAwayTeam();

  const fields = [homeTeam, awayTeam].map(team => {
    const events = match.getEvents({
      eventTypes: [
        EVENT_PENALTY_GOAL,
        EVENT_PENALTY_MISSED,
        EVENT_PENALTY_SAVED
      ],
      period: PERIOD_PENALTIES,
      teamId: team.getId(),
      until: time
    });

    const scoreString = buildPenaltiesSeriesScore(events);

    return {
      title: `${team.getName(true)}`,
      value: `*${scoreString}*`
    };
  });

  return fields;
};

const sendMessageQueue = new Queue(
  ({ match, event, msg = "", attachments = [] }, done) => {
    const homeTeam = match.getHomeTeam();
    const awayTeam = match.getAwayTeam();
    let text = `${homeTeam.getName(true)} / ${awayTeam.getName(true)}`;

    if (event) {
      const homeScore = get(event, "HomeGoals", 0);
      const awayScore = get(event, "AwayGoals", 0);

      text = ` ${homeTeam.getName(
        true
      )} *${homeScore}-${awayScore}* ${awayTeam.getName(true, true)} `;
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
    msg: `:runner: *Debut de la ${periodName}* `
  });
};

export const handleCardEvent = (match, event, team, player, type) => {
  console.log("New event: card");

  let msg = "";

  switch (type) {
    case "yellow":
      msg += ":large_orange_diamond: *Carton jaune*";
      break;
    case "red":
      msg += ":red_circle: *Carton rouge*";
      break;
    case "yellow+yellow":
      msg += ":red_circle: *Carton rouge* (deux jaunes)";
      break;
    default:
      return;
  }

  msg += ` pour ${player.nameWithFlag} (${event.MatchMinute})`;

  sendMessageQueue.push({
    match,
    event,
    msg
  });
};

export const handleOwnGoalEvent = (match, event, team, player) => {
  const oppTeam = match.getOppositeTeam(team);

  const msg = `:soccer: *Goooooal! pour ${oppTeam.getNameWithDeterminer(
    null,
    true
  )}* (${event.MatchMinute})`;

  const attachments = [
    {
      text: `${player.nameWithFlag} marque contre son camp :face_palm:`,
      color: "danger",
      actions: liveAttachment
    }
  ];

  sendMessageQueue.push({ match, event, msg, attachments });
};

export const handleGoalEvent = (match, event, team, player, type) => {
  console.log("New event: goal");

  if (event.Period === PERIOD_PENALTIES) {
    handlePenaltyShootOutEvent(match, event, team, player);
    return;
  }

  if (type === "own") {
    handleOwnGoalEvent(match, event, team, player);
    return;
  }

  let msg = `:soccer: *Goooooal! pour ${team.getNameWithDeterminer(
    null,
    true
  )}* (${event.MatchMinute})`;

  let attachments = [];
  let addLiveAttachment = true;

  switch (type) {
    case "freekick":
      attachments.push({
        text: `But de ${player.nameWithFlag} sur coup-franc`
      });
      break;
    case "penalty":
      attachments.push({
        text:
          PERIOD_PENALTIES === event.Period
            ? `But de ${player.nameWithFlag}`
            : `But de ${player.name} sur penalty`
      });
      break;
    default:
      attachments.push({
        text: `But de ${player.nameWithFlag}`
      });
  }

  attachments[0].color = "good";
  if (addLiveAttachment) {
    attachments[0].actions = liveAttachment;
  }

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

export const handlePenaltyMissedEvent = (match, event, team, player) => {
  console.log("New event: penaltyMissed");

  if (event.Period === PERIOD_PENALTIES) {
    handlePenaltyShootOutEvent(match, event, team, player);
    return;
  }

  let attachments = [];
  let msg = `:no_good: *${
    player.nameWithFlag
  } manque son penalty (non-cadré)* (${event.MatchMinute})`;

  sendMessageQueue.push({ match, event, msg, attachments });
};

export const handlePenaltySavedEvent = (match, event, team, player) => {
  console.log("New event: penaltySaved");

  if (event.Period === PERIOD_PENALTIES) {
    handlePenaltyShootOutEvent(match, event, team, player);
    return;
  }

  let msg = `:no_good: *${player.nameWithFlag} manque son penalty (sauvé)* (${
    event.MatchMinute
  })`;

  let attachments = [];

  sendMessageQueue.push({ match, event, msg, attachments });
};

export const handlePenaltyShootOutEvent = (match, event, team, player) => {
  let text = "";
  let color = "";
  let attachments = [];

  switch (event.Type) {
    case EVENT_PENALTY_GOAL:
      attachments.push({
        text: `:carlton: ${player.nameWithFlag} marque son penalty`,
        color: "good"
      });
      break;
    case EVENT_PENALTY_MISSED:
      attachments.push({
        text: `:haha: ${player.nameWithFlag} manque son penalty`,
        color: "danger"
      });
      break;
    case EVENT_PENALTY_SAVED:
      attachments.push({
        text: `:mkeyebrows: Le gardien arrête le penalty de ${
          player.nameWithFlag
        }`,
        color: "danger"
      });
      break;
    default:
  }

  attachments[0].fields = buildPenaltiesSeriesfields(match, event.Timestamp);

  sendMessageQueue.push({
    match,
    event,
    attachments
  });
};

export const handleComingUpMatchEvent = match => {
  console.log("New event: comingUpMatch");

  const diff = Math.floor(Math.abs(getNow().diff(match.getDate()) / 1000 / 60));

  const msg = `:soon: *Le match commence bientôt* (${diff} min)`;

  const attachments = [
    {
      title: ">> Pensez à vos pronos <<",
      title_link: "https://www.monpetitprono.com/forecast/matches-to-come"
    }
  ];

  sendMessageQueue.push({ match, msg, attachments });
};

export const handleVarEvent = (match, event) => {
  console.log("New event: VAR");

  // Le but n'est pas de traiter tous les cas d'arbitrage vidéo possibles
  // mais simplement d'indiquer quand un but ou un penalty — ayant été annoncé —
  // est finalement annulé.
  // Ce code est donc basé sur les investigations menées dans cette issue :
  // https://github.com/j0k3r/worldcup-slack-bot/issues/9

  // Donc si j'en crois ce qui y est écrit, si on a la clé "Result" à 4, c'est
  // qu'un penalty à été annulé.

  if (event.VarDetail !== 4) {
    return;
  }

  const msg = `:no_entry_sign: *Penalty annulé après VAR* (${
    event.MatchMinute
  })`;

  sendMessageQueue.push({ match, msg });
};
