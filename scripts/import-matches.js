import fs from 'fs';
import util from 'util';
import fetch from 'node-fetch';
import { format } from 'prettier';
import _ from 'lodash';

export const ID_COMPETITION = 17;
export const ID_SEASON = 254645;
export const ID_GROUP_STAGE = 275073;
export const LOCALE = 'fr-FR';
export const API_ENDPOINT = 'https://api.fifa.com/api/v1';

// Endpoints
const MATCHES_ENDPOINT = `${API_ENDPOINT}/calendar/matches?idseason=${ID_SEASON}&idcompetition=${ID_COMPETITION}&language=${LOCALE}&count=100`;
const EVENTS_ENDPOINT = `${API_ENDPOINT}/timelines/${ID_COMPETITION}/${ID_SEASON}/%s/%s?language=${LOCALE}`;
const MATCH_ENDPOINT = `${API_ENDPOINT}/live/football/${ID_COMPETITION}/${ID_SEASON}/%s/%s?language=${LOCALE}`;

// Paths
const ROOT_DIR_PATH = `${__dirname}/../fixtures`;
const MATCHES_DIR_PATH = `${ROOT_DIR_PATH}/matches`;
const MATCHES_FILE_PATH = `${ROOT_DIR_PATH}/matches.json`;

const downloadFile = (from, to) => {
  fetch(from)
    .then(res => res.text())
    .then((json) => {
      fs.writeFile(to, json, err => err && console.error(err));
    });
};

const getTeamName = (match, side) => _.get(match, [_.capitalize(side), 'TeamName', 0, 'Description']);

if (!fs.existsSync(MATCHES_FILE_PATH)) {
  downloadFile(MATCHES_ENDPOINT, MATCHES_FILE_PATH);
}

const main = async () => {
  const matches = await import(MATCHES_FILE_PATH);

  matches.Results.forEach((match) => {
    if (match.MatchStatus !== 0) {
      return;
    }

    const homeTeamName = _.camelCase(getTeamName(match, 'home'));
    const awayTeamName = _.camelCase(getTeamName(match, 'away'));
    const matchDirName = `${match.IdMatch}-${homeTeamName}-${awayTeamName}`;
    const matchDirPath = `${MATCHES_DIR_PATH}/${matchDirName}`;

    if (!fs.existsSync(matchDirPath)) {
      fs.mkdirSync(matchDirPath);
    }

    const eventsEndpoint = util.format(EVENTS_ENDPOINT, match.IdStage, match.IdMatch);
    const matchEndpoint = util.format(MATCH_ENDPOINT, match.IdStage, match.IdMatch);

    const eventsFilePath = `${matchDirPath}/events.json`;
    const matchFilePath = `${matchDirPath}/match.json`;

    if (!fs.existsSync(eventsFilePath)) {
      downloadFile(eventsEndpoint, eventsFilePath);
    }

    if (!fs.existsSync(matchFilePath)) {
      downloadFile(matchEndpoint, matchFilePath);
    }
  });
};

main();
