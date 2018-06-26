import requestify from "requestify";

import {
  ID_COMPETITION,
  ENDPOINT_MATCHES,
  ENDPOINT_LIVE,
  ENDPOINT_EVENTS
} from "./constants";

import { IS_DEV } from "./utils";

const DEV_CURRENT_MATCH = `match${
  Math.abs(process.argv[2]) < 5 ? process.argv[2] : 1
}`;

export const fetchLiveMatches = async () => {
  if (IS_DEV) {
    return require(`../cache/${DEV_CURRENT_MATCH}/live.json`).Results;
  }

  console.log(`Fetching ${ENDPOINT_LIVE}`);
  const response = await requestify.get(ENDPOINT_LIVE);
  const matches = response.getBody().Results;

  return matches.filter(
    ({ IdCompetition }) => IdCompetition === ID_COMPETITION
  );
};

export const fetchMatchEvents = async match => {
  if (IS_DEV) {
    return require(`../cache/${DEV_CURRENT_MATCH}/events.json`).Event;
  }

  const endpoint = ENDPOINT_EVENTS(match.getStageId(), match.getId());
  console.log(`Fetching ${endpoint}`);
  const response = await requestify.get(endpoint);

  return response.getBody().Event;
};

export const fetchMatches = async () => {
  if (IS_DEV) {
    return require("../cache/matches.json").Results;
  }

  console.log(`Fetching ${ENDPOINT_MATCHES}`);
  const response = await requestify.get(ENDPOINT_MATCHES);

  return response.getBody().Results;
};
