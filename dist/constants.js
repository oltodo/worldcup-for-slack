"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
// Globals
const ID_COMPETITION = exports.ID_COMPETITION = 17;
const ID_SEASON = exports.ID_SEASON = 254645;
const LOCALE = exports.LOCALE = "fr-FR";
const API_ENDPOINT = exports.API_ENDPOINT = "https://api.fifa.com/api/v1";

// Match Statuses
const MATCH_STATUS_FINISHED = exports.MATCH_STATUS_FINISHED = 0;
const MATCH_STATUS_NOT_STARTED = exports.MATCH_STATUS_NOT_STARTED = 1;
const MATCH_STATUS_LIVE = exports.MATCH_STATUS_LIVE = 3;
const MATCH_STATUS_PREMATCH = exports.MATCH_STATUS_PREMATCH = 12; // Maybe?

// Event Types
const EVENT_GOAL = exports.EVENT_GOAL = 0;
const EVENT_YELLOW_CARD = exports.EVENT_YELLOW_CARD = 2;
const EVENT_SECOND_YELLOW_CARD_RED = exports.EVENT_SECOND_YELLOW_CARD_RED = 3; // Maybe?
const EVENT_STRAIGHT_RED = exports.EVENT_STRAIGHT_RED = 4; // Maybe?
const EVENT_PERIOD_START = exports.EVENT_PERIOD_START = 7;
const EVENT_PERIOD_END = exports.EVENT_PERIOD_END = 8;
const EVENT_OWN_GOAL = exports.EVENT_OWN_GOAL = 34;
const EVENT_FREE_KICK_GOAL = exports.EVENT_FREE_KICK_GOAL = 39;
const EVENT_PENALTY_GOAL = exports.EVENT_PENALTY_GOAL = 41;
const EVENT_PENALTY_SAVED = exports.EVENT_PENALTY_SAVED = 60;
const EVENT_PENALTY_MISSED = exports.EVENT_PENALTY_MISSED = 65;
const EVENT_FOUL_PENALTY = exports.EVENT_FOUL_PENALTY = 72;

// Periods
const PERIOD_1ST_HALF = exports.PERIOD_1ST_HALF = 3;
const PERIOD_2ND_HALF = exports.PERIOD_2ND_HALF = 5;

// Endpoints
const ENDPOINT_MATCHES = exports.ENDPOINT_MATCHES = `${API_ENDPOINT}/calendar/matches?idCompetition=${ID_COMPETITION}&idSeason=${ID_SEASON}&count=500&language=${LOCALE}`;
const ENDPOINT_EVENTS = exports.ENDPOINT_EVENTS = (stageId, matchId) => `${API_ENDPOINT}/timelines/${ID_COMPETITION}/${ID_SEASON}/${stageId}/${matchId}?language=${LOCALE}`;
const ENDPOINT_NOW = exports.ENDPOINT_NOW = `https://api.fifa.com/api/v1/live/football/now?language=${LOCALE}`;

const COUNTRIES = exports.COUNTRIES = {
  RUS: { determiner: "la ", flag: "🇷🇺" },
  URU: { determiner: "l'", flag: "🇺🇾" },
  EGY: { determiner: "l'", flag: "🇪🇬" },
  KSA: { determiner: "l'", flag: "🇸🇦" },
  IRN: { determiner: "l'", flag: "🇮🇷" },
  ESP: { determiner: "l'", flag: "🇪🇸" },
  POR: { determiner: "le ", flag: "🇵🇹" },
  MAR: { determiner: "le ", flag: "🇲🇦" },
  FRA: { determiner: "la ", flag: "🇫🇷" },
  DEN: { determiner: "le ", flag: "🇩🇰" },
  AUS: { determiner: "l'", flag: "🇦🇺" },
  PER: { determiner: "le ", flag: "🇵🇪" },
  CRO: { determiner: "la ", flag: "🇭🇷" },
  ISL: { determiner: "l'", flag: "🇮🇸" },
  ARG: { determiner: "l'", flag: "🇦🇷" },
  NGA: { determiner: "le ", flag: "🇳🇬" },
  SRB: { determiner: "la ", flag: "🇷🇸" },
  SUI: { determiner: "la ", flag: "🇨🇭" },
  BRA: { determiner: "le ", flag: "🇧🇷" },
  CRC: { determiner: "la ", flag: "🇨🇷" },
  MEX: { determiner: "le ", flag: "🇲🇽" },
  SWE: { determiner: "la ", flag: "🇸🇪" },
  KOR: { determiner: "la ", flag: "🇰🇷" },
  GER: { determiner: "l'", flag: "🇩🇪" },
  BEL: { determiner: "la ", flag: "🇧🇪" },
  PAN: { determiner: "le ", flag: "🇵🇦" },
  TUN: { determiner: "la ", flag: "🇹🇳" },
  ENG: { determiner: "l'", flag: "🇬🇧" },
  POL: { determiner: "la ", flag: "🇵🇱" },
  SEN: { determiner: "le ", flag: "🇸🇳" },
  COL: { determiner: "la ", flag: "🇨🇴" },
  JPN: { determiner: "le ", flag: "🇯🇵" },
  DEF: { determiner: "", flag: "🏴" }
};