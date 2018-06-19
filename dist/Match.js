"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _moment = require("moment");

var _moment2 = _interopRequireDefault(_moment);

var _events = require("events");

var _lodash = require("lodash");

var _constants = require("./constants");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Match extends _events.EventEmitter {
  constructor(data) {
    super();

    this.data = data;
    this.events = [];

    if (process.env.NODE_ENV === "development") {
      this.lastCheck = (0, _moment2.default)("2018-06-18T14:00");
    } else {
      this.lastCheck = (0, _moment2.default)();
    }
  }

  update(data) {
    this.data = data;
  }

  getId() {
    return this.data.IdMatch;
  }

  getStageId() {
    return this.data.IdStage;
  }

  getData() {
    return this.data;
  }

  updateEvents(events) {
    const newEvents = (0, _lodash.differenceWith)(events, this.events, (event1, event2) => event1.EventId === event2.EventId).filter(event => this.lastCheck.diff(event.Timestamp) <= 0);

    newEvents.forEach(event => {
      const team = (0, _lodash.find)([this.data.HomeTeam, this.data.AwayTeam], {
        IdTeam: event.IdTeam
      });

      switch (event.Type) {
        case _constants.EVENT_PERIOD_START:
          switch (event.Period) {
            case _constants.PERIOD_1ST_HALF:
              this.emit("matchStart", this.data, event);
              break;
            case _constants.PERIOD_2ND_HALF:
              this.emit("secondPeriodStart", this.data, event);
              break;
            default:
          }
          break;
        case _constants.EVENT_PERIOD_END:
          switch (event.Period) {
            case _constants.PERIOD_1ST_HALF:
              this.emit("firstPeriodEnd", this.data, event);
              break;
            case _constants.PERIOD_2ND_HALF:
              this.emit("matchEnd", this.data, event);
              break;
            default:
          }
          break;

        case _constants.EVENT_GOAL:
          this.emit("goal", this.data, event, team, "regular");
          break;
        case _constants.EVENT_FREE_KICK_GOAL:
          this.emit("goal", this.data, event, team, "freekick");
          break;
        case _constants.EVENT_PENALTY_GOAL:
          this.emit("goal", this.data, event, team, "penalty");
          break;
        case _constants.EVENT_OWN_GOAL:
          this.emit("goal", this.data, event, team, "own");
          break;

        case _constants.EVENT_YELLOW_CARD:
          this.emit("card", this.data, event, team, "yellow");
          break;
        case _constants.EVENT_SECOND_YELLOW_CARD_RED:
          this.emit("card", this.data, event, team, "yellow+red");
          break;
        case _constants.EVENT_STRAIGHT_RED:
          this.emit("card", this.data, event, team, "red");
          break;

        case _constants.EVENT_FOUL_PENALTY:
          this.emit("penalty", this.data, event, team);
          break;
        case _constants.EVENT_PENALTY_MISSED:
          this.emit("penalty missed", this.data, event, team, "missed");
          break;
        case _constants.EVENT_PENALTY_SAVED:
          this.emit("penalty missed", this.data, event, team, "saved");
          break;
        default:
      }
    });

    this.events = events;
    this.lastCheck = (0, _moment2.default)();
  }
}
exports.default = Match;