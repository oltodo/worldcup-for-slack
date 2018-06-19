import moment from "moment";
import { EventEmitter } from "events";
import { differenceWith, find } from "lodash";

import {
  EVENT_GOAL,
  EVENT_YELLOW_CARD,
  EVENT_SECOND_YELLOW_CARD_RED,
  EVENT_STRAIGHT_RED,
  EVENT_PERIOD_START,
  EVENT_PERIOD_END,
  EVENT_OWN_GOAL,
  EVENT_FREE_KICK_GOAL,
  EVENT_PENALTY_GOAL,
  EVENT_PENALTY_SAVED,
  EVENT_PENALTY_MISSED,
  EVENT_FOUL_PENALTY,
  PERIOD_1ST_HALF,
  PERIOD_2ND_HALF
} from "./constants";

export default class Match extends EventEmitter {
  constructor(data) {
    super();

    this.data = data;
    this.events = [];

    if (process.env.NODE_ENV === "development") {
      this.lastCheck = moment("2018-06-18T14:00");
    } else {
      this.lastCheck = moment();
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
    const newEvents = differenceWith(
      events,
      this.events,
      (event1, event2) => event1.EventId === event2.EventId
    ).filter(event => this.lastCheck.diff(event.Timestamp) <= 0);

    newEvents.forEach(event => {
      const team = find([this.data.HomeTeam, this.data.AwayTeam], {
        IdTeam: event.IdTeam
      });

      switch (event.Type) {
        case EVENT_PERIOD_START:
          switch (event.Period) {
            case PERIOD_1ST_HALF:
              this.emit("matchStart", this.data, event);
              break;
            case PERIOD_2ND_HALF:
              this.emit("secondPeriodStart", this.data, event);
              break;
            default:
          }
          break;
        case EVENT_PERIOD_END:
          switch (event.Period) {
            case PERIOD_1ST_HALF:
              this.emit("firstPeriodEnd", this.data, event);
              break;
            case PERIOD_2ND_HALF:
              this.emit("matchEnd", this.data, event);
              break;
            default:
          }
          break;

        case EVENT_GOAL:
          this.emit("goal", this.data, event, team, "regular");
          break;
        case EVENT_FREE_KICK_GOAL:
          this.emit("goal", this.data, event, team, "freekick");
          break;
        case EVENT_PENALTY_GOAL:
          this.emit("goal", this.data, event, team, "penalty");
          break;
        case EVENT_OWN_GOAL:
          this.emit("goal", this.data, event, team, "own");
          break;

        case EVENT_YELLOW_CARD:
          this.emit("card", this.data, event, team, "yellow");
          break;
        case EVENT_SECOND_YELLOW_CARD_RED:
          this.emit("card", this.data, event, team, "yellow+red");
          break;
        case EVENT_STRAIGHT_RED:
          this.emit("card", this.data, event, team, "red");
          break;

        case EVENT_FOUL_PENALTY:
          this.emit("penalty", this.data, event, team);
          break;
        case EVENT_PENALTY_MISSED:
          this.emit("penalty missed", this.data, event, team, "missed");
          break;
        case EVENT_PENALTY_SAVED:
          this.emit("penalty missed", this.data, event, team, "saved");
          break;
        default:
      }
    });

    this.events = events;
    this.lastCheck = moment();
  }
}
