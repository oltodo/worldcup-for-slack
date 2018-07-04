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
export const EVENT_GARDIAN_BLOCKED = 9999; // je croyais que c etait 14 il semble que non// arrêt ?
export const EVENT_CORNER_SHOT = 16; // corner tiré
export const EVENT_TRANSVERSALE = 32;
export const EVENT_FOUL = 18;

// Secondary Events type
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
export const ENDPOINT_LIVE = `https://api.fifa.com/api/v1/live/football/now?idCompetition=${ID_COMPETITION}&idSeason=${ID_SEASON}&count=500&language=${LOCALE}`;

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
  RUS: { determiner: 'la ', flag: '🇷🇺' },
  URU: { determiner: "l'", flag: '🇺🇾' },
  EGY: { determiner: "l'", flag: '🇪🇬' },
  KSA: { determiner: "l'", flag: '🇸🇦' },
  IRN: { determiner: "l'", flag: '🇮🇷' },
  ESP: { determiner: "l'", flag: '🇪🇸' },
  POR: { determiner: 'le ', flag: '🇵🇹' },
  MAR: { determiner: 'le ', flag: '🇲🇦' },
  FRA: { determiner: 'la ', flag: '🇫🇷' },
  DEN: { determiner: 'le ', flag: '🇩🇰' },
  AUS: { determiner: "l'", flag: '🇦🇺' },
  PER: { determiner: 'le ', flag: '🇵🇪' },
  CRO: { determiner: 'la ', flag: '🇭🇷' },
  ISL: { determiner: "l'", flag: '🇮🇸' },
  ARG: { determiner: "l'", flag: '🇦🇷' },
  NGA: { determiner: 'le ', flag: '🇳🇬' },
  SRB: { determiner: 'la ', flag: '🇷🇸' },
  SUI: { determiner: 'la ', flag: '🇨🇭' },
  BRA: { determiner: 'le ', flag: '🇧🇷' },
  CRC: { determiner: 'la ', flag: '🇨🇷' },
  MEX: { determiner: 'le ', flag: '🇲🇽' },
  SWE: { determiner: 'la ', flag: '🇸🇪' },
  KOR: { determiner: 'la ', flag: '🇰🇷' },
  GER: { determiner: "l'", flag: '🇩🇪' },
  BEL: { determiner: 'la ', flag: '🇧🇪' },
  PAN: { determiner: 'le ', flag: '🇵🇦' },
  TUN: { determiner: 'la ', flag: '🇹🇳' },
  ENG: { determiner: "l'", flag: '🇬🇧' },
  POL: { determiner: 'la ', flag: '🇵🇱' },
  SEN: { determiner: 'le ', flag: '🇸🇳' },
  COL: { determiner: 'la ', flag: '🇨🇴' },
  JPN: { determiner: 'le ', flag: '🇯🇵' },
  DEF: { determiner: '', flag: '🏴' },
};
