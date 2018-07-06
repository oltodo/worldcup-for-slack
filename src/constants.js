// Globals
export const ID_COMPETITION = 17;
export const ID_SEASON = 254645;
export const ID_GROUP_STAGE = 275073;
export const LOCALE = 'fr-FR';
export const API_ENDPOINT = 'https://api.fifa.com/api/v1';

// Match Statuses
export const MATCH_STATUS_FINISHED = 0;
export const MATCH_STATUS_NOT_STARTED = 1;
export const MATCH_STATUS_LIVE = 3;
export const MATCH_STATUS_PREMATCH = 12; // Maybe?

// Event Types
export const EVENT_GOAL = 0;
export const EVENT_YELLOW_CARD = 2;
export const EVENT_SECOND_YELLOW_CARD_RED = 4;
export const EVENT_STRAIGHT_RED = 3;
export const EVENT_PERIOD_START = 7;
export const EVENT_PERIOD_END = 8;
export const EVENT_OWN_GOAL = 34;
export const EVENT_FREE_KICK_GOAL = 39;
export const EVENT_PENALTY_GOAL = 41;
export const EVENT_PENALTY_SAVED = 60;
export const EVENT_PENALTY_MISSED = 65;
export const EVENT_PENALTY_CROSSBAR = 46;
export const EVENT_FOUL_PENALTY = 72;
export const EVENT_MATCH_START = 19;
export const EVENT_MATCH_END = 26;
export const EVENT_VAR = 71;
export const EVENT_SHOOT = 12; // tir (cadré ou non)
export const EVENT_SHOOT_SAVED = 17; // tir dévié ou parade
export const EVENT_CORNER_SHOT = 16; // corner tiré
export const EVENT_FREE_KICK_SHOT = 1; // coup franc tiré
export const EVENT_TRANSVERSALE = 32;
export const EVENT_FOUL = 18;
export const EVENT_OFF_SIDE = 15;

// Periods
export const PERIOD_1ST_HALF = 3;
export const PERIOD_2ND_HALF = 5;
export const PERIOD_EXPAND_1ST_HALF = 7;
export const PERIOD_EXPAND_2ND_HALF = 9;
export const PERIOD_PENALTIES = 11;

// Endpoints
export const ENDPOINT_MATCHES = `${API_ENDPOINT}/calendar/matches?idCompetition=${ID_COMPETITION}&idSeason=${ID_SEASON}&count=500&language=${LOCALE}`;
export const ENDPOINT_EVENTS = (stageId, matchId) => `${API_ENDPOINT}/timelines/${ID_COMPETITION}/${ID_SEASON}/${stageId}/${matchId}?language=${LOCALE}`;
export const ENDPOINT_LIVE = `${API_ENDPOINT}/live/football/now?idCompetition=${ID_COMPETITION}&idSeason=${ID_SEASON}&count=500&language=${LOCALE}`;

// Penalties display
export const PENALTY_OK = ':large_blue_circle:';
export const PENALTY_NOK = ':red_circle:';
export const PENALTY_INCOMING = ':white_circle:';

export const EMOJIS_FOR_GOAL = [
  ':bananadance:',
  ':party-parrot:',
  ':leftshark:',
  ':epic-sax-guy:',
  ':carlton:',
  ':awyeah:',
  ':bim:',
  ':bigboom:',
  ':kirby_dance:',
];
export const EMOJIS_FOR_PENALTY_MISSED = [':thooo:', ':haha:', ':headesk:'];
export const EMOJIS_FOR_PENALTY_SAVED = [...EMOJIS_FOR_PENALTY_MISSED, ':mkeyebrows:', ':ninja:'];

export const COUNTRIES = {
  RUS: { determiner: 'la ', flag: '🇷🇺', nat: 'russe' },
  URU: { determiner: "l'", flag: '🇺🇾', nat: 'urugayen' },
  EGY: { determiner: "l'", flag: '🇪🇬', nat: 'égyptien' },
  KSA: { determiner: "l'", flag: '🇸🇦', nat: 'saoudien' },
  IRN: { determiner: "l'", flag: '🇮🇷', nat: 'iranien' },
  ESP: { determiner: "l'", flag: '🇪🇸', nat: 'espagnol' },
  POR: { determiner: 'le ', flag: '🇵🇹', nat: 'portugais' },
  MAR: { determiner: 'le ', flag: '🇲🇦', nat: 'marocain' },
  FRA: { determiner: 'la ', flag: '🇫🇷', nat: 'français' },
  DEN: { determiner: 'le ', flag: '🇩🇰', nat: 'danois' },
  AUS: { determiner: "l'", flag: '🇦🇺', nat: 'australien' },
  PER: { determiner: 'le ', flag: '🇵🇪', nat: 'péruvien' },
  CRO: { determiner: 'la ', flag: '🇭🇷', nat: 'croate' },
  ISL: { determiner: "l'", flag: '🇮🇸', nat: 'islandais' },
  ARG: { determiner: "l'", flag: '🇦🇷', nat: 'argentin' },
  NGA: { determiner: 'le ', flag: '🇳🇬', nat: 'nigérian' },
  SRB: { determiner: 'la ', flag: '🇷🇸', nat: 'serbe' },
  SUI: { determiner: 'la ', flag: '🇨🇭', nat: 'suisse' },
  BRA: { determiner: 'le ', flag: '🇧🇷', nat: 'brésilien' },
  CRC: { determiner: 'la ', flag: '🇨🇷', nat: 'costaricien' },
  MEX: { determiner: 'le ', flag: '🇲🇽', nat: 'mexicain' },
  SWE: { determiner: 'la ', flag: '🇸🇪', nat: 'suédois' },
  KOR: { determiner: 'la ', flag: '🇰🇷', nat: 'coréen' },
  GER: { determiner: "l'", flag: '🇩🇪', nat: 'allemand' },
  BEL: { determiner: 'la ', flag: '🇧🇪', nat: 'belge' },
  PAN: { determiner: 'le ', flag: '🇵🇦', nat: 'panaméen' },
  TUN: { determiner: 'la ', flag: '🇹🇳', nat: 'tunisien' },
  ENG: { determiner: "l'", flag: '🇬🇧', nat: 'anglais' },
  POL: { determiner: 'la ', flag: '🇵🇱', nat: 'polonais' },
  SEN: { determiner: 'le ', flag: '🇸🇳', nat: 'sénégalais' },
  COL: { determiner: 'la ', flag: '🇨🇴', nat: 'colombien' },
  JPN: { determiner: 'le ', flag: '🇯🇵', nat: 'japonais' },
  DEF: { determiner: '', flag: '🏴', nat: 'inconnu' },
};
