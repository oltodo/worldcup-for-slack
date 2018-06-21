import requestify from "requestify";

import {
  ID_COMPETITION,
  ENDPOINT_MATCHES,
  ENDPOINT_NOW,
  ENDPOINT_EVENTS
} from "./constants";

import { IS_DEV } from "./utils";

const DEV_CURRENT_MATCH = `match${process.env.MATCH || 1}`;

export const fetchCurrentMatches = async () => {
  let results;

  if (IS_DEV) {
    results = require(`../cache/${DEV_CURRENT_MATCH}/now.json`).Results;
  } else {
    console.log(`Fetching ${ENDPOINT_NOW}`);
    const response = await requestify.get(ENDPOINT_NOW);
    results = response.getBody().Results;
  }

  return results.filter(
    item => parseInt(item.IdCompetition, 10) === ID_COMPETITION
  );
};

export const fetchMatchEvents = async match => {
  let results;

  if (IS_DEV) {
    results = require(`../cache/${DEV_CURRENT_MATCH}/events.json`).Event;
  } else {
    const endpoint = ENDPOINT_EVENTS(match.getStageId(), match.getId());
    console.log(`Fetching ${endpoint}`);
    const response = await requestify.get(endpoint);
    results = response.getBody().Event;
  }

  return results;
};

export const fetchMatches = async () => {
  let results;

  if (IS_DEV) {
    results = require("../cache/matches.json").Results;
  } else {
    console.log(`Fetching ${ENDPOINT_MATCHES}`);
    const response = await requestify.get(ENDPOINT_MATCHES);
    results = response.getBody().Results;
  }

  return results;
};
