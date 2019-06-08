import Queue from 'better-queue';
import { get, sample, chain } from 'lodash';
import moment from 'moment';

import { log } from './utils';
import {
  EVENT_YELLOW_CARD,
  EVENT_STRAIGHT_RED,
  EVENT_SECOND_YELLOW_CARD_RED,
  EVENT_FREE_KICK_GOAL,
  EVENT_OWN_GOAL,
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

const getPenaltyTitle = (type, player) => {
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
    match, event, title, attachments = [], showMatchMinute = true,
  }, done) => {
    const homeTeam = match.getHomeTeam();
    const awayTeam = match.getAwayTeam();

    let text = `${homeTeam.getName(true)} / ${awayTeam.getName(true)}`;
    let finalTitle = `*${title}*`;

    if (event) {
      const homeScore = get(event, 'HomeGoals', 0);
      const awayScore = get(event, 'AwayGoals', 0);

      text = ` ${homeTeam.getName(true)} *${homeScore}-${awayScore}* ${awayTeam.getName(
        true,
        true,
      )}`;

      if (showMatchMinute) {
        finalTitle = `${finalTitle} (${event.MatchMinute})`;
      }
    }

    slackhook.send({
      text,
      attachments: [{ text: finalTitle, color: 'good' }, ...attachments],
    });

    done();
  },
  { afterProcessDelay: 1000 },
);

export const handleMatchEndEvent = (match, event) => {
  log('New event: matchEnd');

  const {
    HomeGoals, AwayGoals, HomePenaltyGoals, AwayPenaltyGoals,
  } = event;

  const diff = HomeGoals + HomePenaltyGoals - (AwayGoals + AwayPenaltyGoals);
  const title = ':coin: Fin du match';
  let text = null;

  if (diff === 0) {
    text = 'Les deux équipes se quittent sur un match nul.';
  } else if (diff > 0) {
    text = `Victoire ${match.getHomeTeam().getNameWithDeterminer('de', true)} !!!`;
  } else {
    text = `Victoire ${match.getAwayTeam().getNameWithDeterminer('de', true)} !!!`;
  }

  sendMessageQueue.push({
    match,
    event,
    title,
    attachments: [{ text }],
  });
};

export const handlePeriodStartEvent = (match, event) => {
  log('New event: periodStart');

  const { Period } = event;

  let title = ':redsiren:';

  switch (Period) {
    case PERIOD_1ST_HALF:
      title = `${title} Le coup d'envoi a été donné`;
      break;
    case PERIOD_2ND_HALF:
      title = `${title} La mi-temps est terminée, le match reprend`;
      break;
    case PERIOD_EXPAND_1ST_HALF:
      title = `${title} C'est parti pour la première période de prolongation`;
      break;
    case PERIOD_EXPAND_2ND_HALF:
      title = `${title} La pause est finie, la prolongation reprend`;
      break;
    case PERIOD_PENALTIES:
      title = `${title} La séance de tirs au but commence`;
      break;
    default:
      return;
  }

  sendMessageQueue.push({
    match,
    event,
    title,
    showMatchMinute: false,
  });
};

export const handlePeriodEndEvent = (match, event) => {
  log('New event: periodEnd');

  const { Period, HomeGoals, AwayGoals } = event;

  let title = ':redsiren:';
  let text = null;

  if (Period === PERIOD_1ST_HALF) {
    title = `${title} Fin de la première période`;
  } else if (Period === PERIOD_EXPAND_1ST_HALF) {
    title = `${title} Fin de la première période de prolongation`;
  } else if (HomeGoals !== AwayGoals || match.isGroupStage() || Period === PERIOD_PENALTIES) {
    handleMatchEndEvent(match, event);
    return;
  } else if (Period === PERIOD_2ND_HALF) {
    title = `${title} Fin de la seconde période`;
    text = "Les deux équipes n'ont pas su se départager, il y aura une prolongation.";
  } else if (Period === PERIOD_EXPAND_2ND_HALF) {
    title = `${title} Fin de la seconde période de prolongation`;
    text = 'Les deux équipes restent à égalité, il y aura donc une séance de tirs au but.';
  } else {
    return;
  }

  sendMessageQueue.push({
    match,
    event,
    title,
    attachments: [{ text }],
  });
};

export const handleCardEvent = (match, event, team, player) => {
  log('New event: card');

  let title = null;

  switch (event.Type) {
    case EVENT_YELLOW_CARD:
      title = ':yellow_card: Carton jaune';
      break;
    case EVENT_STRAIGHT_RED:
      title = ':red_card: Carton rouge';
      break;
    case EVENT_SECOND_YELLOW_CARD_RED:
      title = ':red_card: Carton rouge (deux jaunes)';
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
    title: `:exclamation: Penalty accordé ${oppTeam.getNameWithDeterminer('à', true)}`,
  });
};

export const handleOwnGoalEvent = (match, event, team, player) => {
  const oppTeam = match.getOppositeTeam(team);

  const title = `:soccer: Goooooal! pour ${oppTeam.getNameWithDeterminer(null, true)}`;

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
    title: getPenaltyTitle(event.Type, player),
    attachments: [{ fields: buildPenaltiesSeriesfields(match, event.Timestamp) }],
  });
};

export const handleGoalEvent = (match, event, team, player) => {
  log('New event: goal');

  if (event.Period === PERIOD_PENALTIES) {
    handlePenaltyShootOutGoalEvent(match, event, team, player);
    return;
  }

  if (event.Type === EVENT_OWN_GOAL) {
    handleOwnGoalEvent(match, event, team, player);
    return;
  }

  const title = `${getGoalEmoji()} Goooooal! pour ${team.getNameWithDeterminer(null, true)}`;

  let text;

  if (player) {
    switch (event.Type) {
      case EVENT_FREE_KICK_GOAL:
        text = `But de ${player.nameWithFlag} sur coup-franc`;
        break;
      case EVENT_PENALTY_GOAL:
        text = `But de ${player.name} sur penalty`;
        break;
      default:
        text = `But de ${player.nameWithFlag}`;
    }
  }

  sendMessageQueue.push({
    match,
    event,
    title,
    attachments: [{ text }],
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
    title: getPenaltyTitle(event.Type, player),
  });
};

export const handleComingUpMatchEvent = (match) => {
  log('New event: comingUpMatch');

  const diff = Math.floor(Math.abs(moment().diff(match.getDate()) / 1000 / 60));

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
  // Le but n'est pas de traiter tous les cas d'arbitrage vidéo possibles
  // mais simplement d'indiquer quand un but ou un penalty — ayant été annoncé —
  // est finalement annulé.
  // Ce code est donc basé sur les investigations menées dans cette issue :
  // https://github.com/j0k3r/worldcup-slack-bot/issues/9

  // Donc si j'en crois ce qui y est écrit, si on a la clé "Result" à 4, c'est
  // qu'un penalty à été annulé.

  const {
    VarDetail: { Status, Result },
  } = event;

  let title = null;

  if (Status === 2) {
    title = ':tv: VAR demandée';
  }

  if (Result === 4) {
    title = ':no_entry_sign: Penalty annulé après VAR';
  }

  if (title) {
    log('New event: VAR');

    sendMessageQueue.push({ match, title });
  }
};

export const handleShootEvent = (match, event, team, player, subPlayer) => {
  log('New event: Shoot');

  let title;

  if (!subPlayer) {
    title = `:exclamation: ${player.nameWithFlag} tire mais ne cadre pas !`;
  } else {
    title = `:exclamation: Frappe de ${player.nameWithFlag}, contrée par `;
    title += subPlayer.isGoalKeeper
      ? `le gardien ${subPlayer.nationality}`
      : subPlayer.nameWithFlag;
  }

  sendMessageQueue.push({
    match,
    event,
    title,
  });
};

// export const handleGardianBlockedEvent = (match, event, team) => {
//   log('New event: GardianBlocked');
//
//   sendMessageQueue.push({
//     match,
//     event,
//     title: `:exclamation: Arrêt du gardien ${team.getNameWithDeterminer('de', true)} !`,
//   });
// };

export const handleShootSavedEvent = (match, event, team, player) => {
  log('New event: ShootSaved');

  const title = player.isGoalKeeper
    ? `:exclamation: Parade du gardien ${team.getNationality()} !`
    : `:exclamation: Sauvetage de ${player.nameWithFlag} !`;

  sendMessageQueue.push({
    match,
    event,
    title,
  });
};

export const handleFoulEvent = (match, event, team, player) => {
  log('New event: Foul');

  const title = `:sifflet: Faute ${
    player ? `de ${player.nameWithFlag}` : team.getNameWithDeterminer('de', true)
  } !`;
  sendMessageQueue.push({
    match,
    event,
    title,
  });
};

export const handleCornerShotEvent = (match, event, team, player) => {
  log('New event: CornerShot');

  const title = `Corner tiré par ${
    player ? player.nameWithFlag : team.getNameWithDeterminer(null, true)
  } !`;
  sendMessageQueue.push({
    match,
    event,
    title,
  });
};

export const handleOffSideEvent = (match, event, team, player) => {
  log('New event: OffSide');

  const title = `L'arbitre signale une position de hors-jeu de ${
    player ? player.nameWithFlag : team.getNameWithDeterminer(null, true)
  } !`;

  sendMessageQueue.push({
    match,
    event,
    title,
  });
};

export const handleFreeKickShotEvent = (match, event, team, player) => {
  log('New event: FreeKickShot');

  const title = `Coup franc tiré par ${
    player ? player.nameWithFlag : team.getNameWithDeterminer(null, true)
  } !`;

  sendMessageQueue.push({
    match,
    event,
    title,
  });
};
