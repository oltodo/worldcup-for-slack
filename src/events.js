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

    // const groupName = get(match, "GroupName.0.Description");

    let text = `${homeTeam.getName(true)} / ${awayTeam.getName(true)}`;

    if (event) {
      const homeScore = get(event, "HomeGoals", 0);
      const awayScore = get(event, "AwayGoals", 0);

      text = ` ${homeTeam.getName(
        true
      )} *${homeScore}-${awayScore}* ${awayTeam.getName(true, true)} `;
    }

    // if (groupName) {
    //   text += ` (${groupName})`;
    // }

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

export const handleGoalEvent = (match, event, team, type) => {
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

  // A déterminer
  const oppTeam = match.getOppositeTeam(team);

  let msg = `:no_good: *Penalty raté* par ${oppTeam.getNameWithDeterminer(
    null,
    true
  )} (${event.MatchMinute})`;

  sendMessageQueue.push({ match, event, msg });
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
