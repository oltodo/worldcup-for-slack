import Queue from 'better-queue';
import { get, sample, chain } from 'lodash';

import { getNow, log } from './utils';
import {
  EVENT_PENALTY_GOAL,
  EVENT_PENALTY_MISSED,
  EVENT_PENALTY_SAVED,
  EVENT_PENALTY_CROSSBAR,
  PENALTY_OK,
  PENALTY_NOK,
  PENALTY_INCOMING,
  PERIOD_1ST_HALF,
  PERIOD_2ND_HALF,
  PERIOD_EXPAND_1ST_HALF,
  PERIOD_EXPAND_2ND_HALF,
  PERIOD_PENALTIES,
  EMOJIS_FOR_GOAL,
  EMOJIS_FOR_PENALTY_MISSED,
  EMOJIS_FOR_PENALTY_SAVED,
} from './constants';

const SLACKHOOK = process.env.SLACKHOOK
  || 'https://hooks.slack.com/services/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';

const slackhook = require('slack-notify')(SLACKHOOK);

const liveAttachment = [
  {
    type: 'button',
    text: ':tv: Accéder au live',
    url: 'http://neosportek.blogspot.com/p/world-cup.html',
  },
];

const getGoalEmoji = () => sample(EMOJIS_FOR_GOAL);
const getPenaltyMissedEmoji = () => sample(EMOJIS_FOR_PENALTY_MISSED);
const getPenaltySavedEmoji = () => sample(EMOJIS_FOR_PENALTY_SAVED);

const buildPenaltiesSeriesScore = events => chain(Array(5))
  .fill(PENALTY_INCOMING)
  .assign(events.map(event => (event.Type === EVENT_PENALTY_GOAL ? PENALTY_OK : PENALTY_NOK)))
  .chunk(5)
  .map(chunk => chunk.join(''))
  .join(' ')
  .value();

const buildPenaltiesSeriesfields = (match, time) => {
  const homeTeam = match.getHomeTeam();
  const awayTeam = match.getAwayTeam();

  const fields = [homeTeam, awayTeam].map((team) => {
    const events = match.getEvents({
      eventTypes: [
        EVENT_PENALTY_GOAL,
        EVENT_PENALTY_MISSED,
        EVENT_PENALTY_SAVED,
        EVENT_PENALTY_CROSSBAR,
      ],
      period: PERIOD_PENALTIES,
      teamId: team.getId(),
      until: time,
    });

    const scoreString = buildPenaltiesSeriesScore(events);

    return {
      title: `${team.getName(true)}`,
      value: `*${scoreString}*`,
    };
  });

  return fields;
};

const getPenaltyFailedTitle = (type, player) => {
  switch (type) {
    case EVENT_PENALTY_GOAL:
      return `${getGoalEmoji()} ${player.nameWithFlag} marque le tir au but`;
    case EVENT_PENALTY_MISSED:
      return `${getPenaltyMissedEmoji()} ${player.nameWithFlag} manque son penalty`;
    case EVENT_PENALTY_SAVED:
      return `${getPenaltySavedEmoji()} Le gardien arrête le penalty de ${player.nameWithFlag}`;
    case EVENT_PENALTY_CROSSBAR:
      return `${getPenaltyMissedEmoji()} ${
        player.nameWithFlag
      } tire son penalty sur la barre transversale`;
    default:
  }

  return null;
};

const sendMessageQueue = new Queue(
  ({
    match, event, title, attachments = [],
  }, done) => {
    const homeTeam = match.getHomeTeam();
    const awayTeam = match.getAwayTeam();
    let text = `${homeTeam.getName(true)} / ${awayTeam.getName(true)}`;

    if (event) {
      const homeScore = get(event, 'HomeGoals', 0);
      const awayScore = get(event, 'AwayGoals', 0);

      text = ` ${homeTeam.getName(true)} *${homeScore}-${awayScore}* ${awayTeam.getName(
        true,
        true,
      )} `;
    }

    slackhook.send({
      text,
      attachments: [{ title, color: 'good' }, ...attachments],
    });

    done();
  },
  { afterProcessDelay: 1000 },
);

export const handlePeriodStartEvent = (match, event) => {
  log('New event: periodStart');

  let title = ':redsiren:';

  const { Period } = event;

  if (Period === PERIOD_1ST_HALF) {
    title = `${title} C'est parti, le match commence !`;
  } else if (Period === PERIOD_2ND_HALF) {
    title = `${title} La mi-temps est terminée, le match reprend !`;
  } else if (Period === PERIOD_EXPAND_1ST_HALF) {
    title = `${title} C'est parti pour cette première période de prolongation !`;
  } else if (Period === PERIOD_EXPAND_2ND_HALF) {
    title = `${title} La pause est finie, le prolongation reprend !`;
  } else if (Period === PERIOD_PENALTIES) {
    title = `${title} C'est le début de la séance de tirs au but !`;
  } else {
    return;
  }

  sendMessageQueue.push({
    match,
    event,
    title,
  });
};

export const handlePeriodEndEvent = (/* match, event */) => {
  // log('New event: firstPeriodEnd');
  //
  // const title = null;
  // const {
  //   Period, MatchMinute, HomeGoals, AwayGoals,
  // } = event;
  //   if (Period === PERIOD_1ST_HALF) {
  //     title = `Fin de la première période. (${MatchMinute})`;
  //   } else {
  //
  //     if (!match.isGroupStage() && HomeGoals === AwayGoals) {
  //
  //     }
  //
  //
  //
  //     if (Period === PERIOD_2ND_HALF) {
  //     }
  //
  //     title = 'Le match reprend !';
  //   } else if (Period === PERIOD_EXPAND_1ST_HALF) {
  //     title = 'Les prolongations commencent !';
  //   } else if (Period === PERIOD_EXPAND_2ND_HALF) {
  //     title = 'Les prolongations reprennent !';
  //   } else if (Period === PERIOD_PENALTIES) {
  //     title = "C'est le début de la séance de tirs au but !";
  //   } else {
  //     return;
  //   }
  // }
  //
  // sendMessageQueue.push({
  //   match,
  //   event,
  //   title,
  // });
};

export const handleCardEvent = (match, event, team, player, type) => {
  log('New event: card');

  let title = `(${event.MatchMinute})`;

  switch (type) {
    case 'yellow':
      title = `:yellow_card: Carton jaune ${title}`;
      break;
    case 'red':
      title = `:red_card: Carton rouge ${title}`;
      break;
    case 'yellow+yellow':
      title = `:red_card: Carton rouge (deux jaunes) ${title}`;
      break;
    default:
      return;
  }

  const text = `Pour ${player.nameWithFlag}`;

  sendMessageQueue.push({
    match,
    event,
    title,
    attachments: [{ text }],
  });
};

export const handlePenaltyEvent = (match, event, team) => {
  log('New event: penalty');

  const oppTeam = match.getOppositeTeam(team);

  sendMessageQueue.push({
    match,
    event,
    title: `:exclamation: Penalty accordé ${oppTeam.getNameWithDeterminer('à', true)} (${
      event.MatchMinute
    })`,
  });
};

export const handleOwnGoalEvent = (match, event, team, player) => {
  const oppTeam = match.getOppositeTeam(team);

  const title = `:soccer: Goooooal! pour ${oppTeam.getNameWithDeterminer(null, true)} (${
    event.MatchMinute
  })`;

  const attachments = [
    {
      text: `${player.nameWithFlag} marque contre son camp :facepalm:`,
      color: 'danger',
      actions: liveAttachment,
    },
  ];

  sendMessageQueue.push({
    match,
    event,
    title,
    attachments,
  });
};

export const handlePenaltyShootOutGoalEvent = (match, event, team, player) => {
  sendMessageQueue.push({
    match,
    event,
    title: getPenaltyFailedTitle(event.Type, player),
    attachments: [{ fields: buildPenaltiesSeriesfields(match, event.Timestamp) }],
  });
};

export const handleGoalEvent = (match, event, team, player, type) => {
  log('New event: goal');

  if (event.Period === PERIOD_PENALTIES) {
    handlePenaltyShootOutGoalEvent(match, event, team, player);
    return;
  }

  if (type === 'own') {
    handleOwnGoalEvent(match, event, team, player);
    return;
  }

  const title = `${getGoalEmoji()} Goooooal! pour ${team.getNameWithDeterminer(null, true)} (${
    event.MatchMinute
  })`;

  let text;

  switch (type) {
    case 'freekick':
      text = `But de ${player.nameWithFlag} sur coup-franc`;
      break;
    case 'penalty':
      text = `But de ${player.name} sur penalty`;
      break;
    default:
      text = `But de ${player.nameWithFlag}`;
  }

  sendMessageQueue.push({
    match,
    event,
    title,
    attachments: [
      {
        text,
        actions: liveAttachment,
      },
    ],
  });
};

export const handlePenaltyFailedEvent = (match, event, team, player) => {
  log('New event: penaltyFailed');

  if (event.Period === PERIOD_PENALTIES) {
    handlePenaltyShootOutGoalEvent(match, event, team, player);
    return;
  }

  sendMessageQueue.push({
    match,
    event,
    title: getPenaltyFailedTitle(event.Type, player),
  });
};

export const handleComingUpMatchEvent = (match) => {
  log('New event: comingUpMatch');

  const diff = Math.floor(Math.abs(getNow().diff(match.getDate()) / 1000 / 60));

  const title = `:soon: Le match commence bientôt (${diff} min)`;
  const attachments = [
    {
      title: '>> Pensez à vos pronos <<',
      title_link: 'https://www.monpetitprono.com/forecast/matches-to-come',
    },
  ];

  sendMessageQueue.push({ match, title, attachments });
};

export const handleVarEvent = (match, event) => {
  log('New event: VAR');

  // Le but n'est pas de traiter tous les cas d'arbitrage vidéo possibles
  // mais simplement d'indiquer quand un but ou un penalty — ayant été annoncé —
  // est finalement annulé.
  // Ce code est donc basé sur les investigations menées dans cette issue :
  // https://github.com/j0k3r/worldcup-slack-bot/issues/9

  // Donc si j'en crois ce qui y est écrit, si on a la clé "Result" à 4, c'est
  // qu'un penalty à été annulé.

  const {
    MatchMinute,
    VarDetail: { Status, Result },
  } = event;

  let title = null;

  if (Status === 2) {
    title = `:tv: VAR demandée (${MatchMinute})`;
  }

  if (Result === 4) {
    title = `:no_entry_sign: Penalty annulé après VAR (${MatchMinute})`;
  }

  if (title) {
    sendMessageQueue.push({ match, title });
  }
};
