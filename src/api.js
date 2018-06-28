import requestify from 'requestify';

import {
  ID_COMPETITION, ENDPOINT_MATCHES, ENDPOINT_LIVE, ENDPOINT_EVENTS,
} from './constants';

import { isDev, log } from './utils';

const DEV_CURRENT_MATCH = `match${Math.abs(process.argv[2]) < 7 ? process.argv[2] : 1}`;

export const fetchLiveMatches = async () => {
  if (isDev()) {
    return (await import(`../cache/${DEV_CURRENT_MATCH}/live.json`)).Results;
  }

  log(`Fetching ${ENDPOINT_LIVE}`);
  const response = await requestify.get(ENDPOINT_LIVE);
  const matches = response.getBody().Results;

  return matches.filter(({ IdCompetition }) => parseInt(IdCompetition, 10) === ID_COMPETITION);
};

export const fetchMatchEvents = async (match) => {
  if (isDev()) {
    return (await import(`../cache/${DEV_CURRENT_MATCH}/events.json`)).Event;
  }

  const endpoint = ENDPOINT_EVENTS(match.getStageId(), match.getId());
  log(`Fetching ${endpoint}`);
  const response = await requestify.get(endpoint);

  return response.getBody().Event;
};

export const fetchMatches = async () => {
  if (isDev()) {
    return (await import('../cache/matches.json')).Results
  }

  log(`Fetching ${ENDPOINT_MATCHES}`);
  const response = await requestify.get(ENDPOINT_MATCHES);

  return response.getBody().Results;
};
