import requestify from 'requestify';
import glob from 'glob';

import {
  ID_COMPETITION, ENDPOINT_MATCHES, ENDPOINT_LIVE, ENDPOINT_EVENTS,
} from './constants';

import { isDev, log } from './utils';

const DEV_CURRENT_MATCH = process.argv[2] || '300331503';
const MATCHES_FILE_PATH = `${__dirname}/../fixtures/matches.json`;
const MATCH_FILE_PATH = `${__dirname}/../fixtures/matches/${DEV_CURRENT_MATCH}-*/match.json`;
const EVENTS_FILE_PATH = `${__dirname}/../fixtures/matches/${DEV_CURRENT_MATCH}-*/events.json`;

export const fetchLiveMatches = async () => {
  if (isDev()) {
    const path = await new Promise(resolve => glob(MATCH_FILE_PATH, (err, files) => resolve(files[0] || null)));
    const match = await import(path);

    return [match];
  }

  log(`Fetching ${ENDPOINT_LIVE}`);
  const response = await requestify.get(ENDPOINT_LIVE);
  const matches = response.getBody().Results;

  return matches.filter(({ IdCompetition }) => parseInt(IdCompetition, 10) === ID_COMPETITION);
};

export const fetchMatchEvents = async (match) => {
  if (isDev()) {
    const path = await new Promise(resolve => glob(EVENTS_FILE_PATH, (err, files) => resolve(files[0] || null)));
    const events = await import(path);

    return events.Event;
  }

  const endpoint = ENDPOINT_EVENTS(match.getStageId(), match.getId());
  log(`Fetching ${endpoint}`);
  const response = await requestify.get(endpoint);

  return response.getBody().Event;
};

export const fetchMatches = async () => {
  if (isDev()) {
    return (await import(MATCHES_FILE_PATH)).Results;
  }

  log(`Fetching ${ENDPOINT_MATCHES}`);
  const response = await requestify.get(ENDPOINT_MATCHES);

  return response.getBody().Results;
};
