import Queue from "better-queue";
import { get } from "lodash";

import { getNow } from "./utils";

const SLACKHOOK =
  process.env.SLACKHOOK ||
  "https://hooks.slack.com/services/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";

const slackhook = require("slack-notify")(SLACKHOOK);

const sendMessageQueue = new Queue(
  ({ match, event, msg, attachments = [] }, done) => {
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

export const handleFirstPeriodEndEvent = (match, event) => {
  console.log("New event: firstPeriodEnd");

  sendMessageQueue.push({
    match,
    event,
    msg: `:toilet: *Fin de la première période* (${event.MatchMinute})`
  });
};

export const handleSecondPeriodStartEvent = (match, event) => {
  console.log("New event: secondPeriodStart");

  sendMessageQueue.push({ match, event, msg: ":runner: *C'est reparti !*" });
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

export const handleGoalEvent = (match, event, team, player, type) => {
  console.log("New event: goal");

  if (type === "own") {
    handleOwnGoalEvent(match, event, team, player);
    return;
  }

  const msg = `:soccer: *Goooooal! pour ${team.getNameWithDeterminer(
    null,
    true
  )}* (${event.MatchMinute})`;

  let attachments = [];

  switch (type) {
    case "freekick":
      attachments.push({
        text: `But de ${player.nameWithFlag} sur coup-franc`
      });
      break;
    case "penalty":
      attachments.push({
        text: `But de ${player.nameWithFlag} sur penalty`
      });
      break;
    default:
      attachments.push({
        text: `But de ${player.nameWithFlag}`
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

  let msg = `:no_good: *${
    player.nameWithFlag
  } manque son penalty (non-cadré)* (${event.MatchMinute})`;

  sendMessageQueue.push({ match, event, msg });
};

export const handlePenaltySavedEvent = (match, event, team, player) => {
  console.log("New event: penaltySaved");

  let msg = `:no_good: *${player.nameWithFlag} manque son penalty (sauvé)* (${
    event.MatchMinute
  })`;

  sendMessageQueue.push({ match, event, msg });
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
