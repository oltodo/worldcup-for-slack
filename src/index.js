import cron from 'cron';
import { map, reduce } from 'lodash';
import moment from 'moment';

import Match from './Match';

import { isDev, log } from './utils';
import { fetchLiveMatches, fetchMatchEvents, fetchMatches } from './api';
import {
  handlePeriodEndEvent,
  handlePeriodStartEvent,
  handleCardEvent,
  handleGoalEvent,
  handlePenaltyEvent,
  handlePenaltyFailedEvent,
  handleComingUpMatchEvent,
  handleVarEvent,
  handleShootEvent,
  handleGardianBlockedEvent,
  handleShootSavedEvent,
  handleFoulEvent,
  handleCornerShotEvent,
  handleOffSideEvent,
  handleFreeKickShotEvent,
} from './events';

const matches = {};

const createMatch = (data) => {
  const match = new Match(data);

  match.on('periodStart', handlePeriodStartEvent);
  match.on('periodEnd', handlePeriodEndEvent);
  match.on('goal', handleGoalEvent);
  match.on('penalty', handlePenaltyEvent);
  match.on('penaltyFailed', handlePenaltyFailedEvent);
  match.on('card', handleCardEvent);
  match.on('var', handleVarEvent);
  match.on('shoot', handleShootEvent);
  match.on('gardianBlocked', handleGardianBlockedEvent);
  match.on('shootSaved', handleShootSavedEvent);
  match.on('foul', handleFoulEvent);
  match.on('cornerShot', handleCornerShotEvent);
  match.on('offSide', handleOffSideEvent);
  match.on('freeKickShot', handleFreeKickShotEvent);

  return match;
};

const getComingUpMatches = () => {
  const now = moment();

  return reduce(
    matches,
    (acc, match) => {
      const diff = Math.ceil(now.diff(match.getDate()) / 1000 / 60);

      if (diff >= -15 && diff < 0) {
        acc.push(match);
      }

      return acc;
    },
    [],
  );
};

const checkComingUpMatches = () => {
  // On annonce les matchs à venir dans (environ) un quart d'heure
  const comingUpMatches = getComingUpMatches();

  comingUpMatches.forEach((match) => {
    // Si l'annonce à déjà été faite on quitte
    if (match.getForecasted() === true) {
      return;
    }

    handleComingUpMatchEvent(match);
    match.setForecasted(true);
  });
};

// Cette fonction vérifie que les matchs qui sont supposés avoir commencé ont
// bien les données complètes ; c'est à dire qu'ils possèdent les données
// provenants de l'API `/live/football`, qui permet notamment de récupérer la
// liste des joueurs de chaque équipe. Sans quoi certains messages ne
// pourraient pas être contruits.
const checkUncompleteMatches = async () => {
  let shouldUpdate = false;

  map(matches, (match) => {
    // On active la mise à jour si le match à commencé et qu'il n'a pas encore toutes les données
    if (!match.isComplete() && (match.isLive() || match.shouldHaveStarted(200))) {
      shouldUpdate = true;
    }
  });

  if (shouldUpdate) {
    map(await fetchLiveMatches(), (data) => {
      matches[data.IdMatch].update(data);
    });
  }
};

const updateEvents = async () => {
  log('Update live matches');

  await checkComingUpMatches();
  await checkUncompleteMatches();

  // On parcourt ensuite la liste des matchs pour savoir s'il faut en récupérer
  // les évènements. Il faut que le match ait démarré et ait les données complètes
  map(matches, async (match) => {
    if ((match.isLive() || match.shouldHaveStarted(200)) && match.isComplete()) {
      const events = await fetchMatchEvents(match);
      match.updateEvents(events);
    }
  });
};

const updateMatches = async () => {
  log('Update competition matches');

  map(await fetchMatches(), (data) => {
    matches[data.IdMatch] = createMatch(data);
  });
};

const init = async () => {
  await updateMatches();

  if (isDev()) {
    updateEvents();
    return;
  }

  // Toutes les nuits à 3h
  cron.job('0 0 3 * * *', updateMatches, false).start();

  // Toutes les 15 secondes
  cron.job('*/15 * * * * *', updateEvents, false).start();

  log('Cron job started');
};

init();
