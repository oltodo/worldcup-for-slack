import moment from "moment";
import { EventEmitter } from "events";
import { differenceWith, find } from "lodash";
import Team from "./Team";

import { getNow } from "./utils";

import {
  EVENT_MATCH_START,
  EVENT_MATCH_END,
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
  EVENT_VAR,
  PERIOD_1ST_HALF,
  PERIOD_2ND_HALF,
  MATCH_STATUS_FINISHED,
  MATCH_STATUS_LIVE
} from "./constants";

export default class Match extends EventEmitter {
  constructor(data) {
    super();

    this.events = [];
    this.forecasted = false;
    this.lastCheck = getNow();
    this.complete = false;

    this.id = data.IdMatch;
    this.stageId = data.IdStage;
    this.date = moment(data.Date);
    this.status = data.MatchStatus;

    this.homeTeam = new Team(data.Home);
    this.awayTeam = new Team(data.Away);
  }

  update(data) {
    this.status = data.MatchStatus;
    this.homeTeam = new Team(data.HomeTeam);
    this.awayTeam = new Team(data.AwayTeam);
    this.complete = this.homeTeam.hasPlayers() && this.awayTeam.hasPlayers();
  }

  getId() {
    return this.id;
  }

  getStageId() {
    return this.stageId;
  }

  getDate() {
    return this.date;
  }

  getHomeTeam() {
    return this.homeTeam;
  }

  getAwayTeam() {
    return this.awayTeam;
  }

  getOppositeTeam(team) {
    if (this.homeTeam.getId() === team.getId()) {
      return this.awayTeam;
    }

    return this.homeTeam;
  }

  getForecasted() {
    return this.forecasted;
  }

  setForecasted(value) {
    this.forecasted = value;
  }

  isLive() {
    return this.status === MATCH_STATUS_LIVE;
  }

  isComplete() {
    return this.complete;
  }

  shouldHaveStarted(from) {
    if (this.status === MATCH_STATUS_FINISHED) {
      return false;
    }

    const diff = Math.floor(getNow().diff(this.getDate()) / 1000 / 60);

    return diff >= 0 && diff < from;
  }

  getName() {
    return `${this.homeTeam.getName()} / ${this.awayTeam.getName()}`;
  }

  updateEvents(events) {
    const newEvents = differenceWith(
      events,
      this.events,
      (event1, event2) => event1.EventId === event2.EventId
    ).filter(event => {
      const diff = Math.floor(this.lastCheck.diff(event.Timestamp) / 1000 / 60);

      // Il semblerait que des évènements soient rajoutés antérieurement à la timeline,
      // le plus souvent après un arbitrage vidéo. On met donc une valeur assez
      // élevée pour en tenir compte (la VAR prend rarement plus de 5 min).
      return diff <= 5;
    });

    console.log(`${newEvents.length} new event(s)`);

    newEvents.forEach(event => {
      const team = find(
        [this.homeTeam, this.awayTeam],
        team => team.getId() === event.IdTeam
      );

      switch (event.Type) {
        case EVENT_MATCH_START:
          this.status = MATCH_STATUS_LIVE;
          this.emit("matchStart", this, event);
          break;
        case EVENT_MATCH_END:
          this.status = MATCH_STATUS_FINISHED;
          this.emit("matchEnd", this, event);
          break;
        case EVENT_PERIOD_START:
          switch (event.Period) {
            case PERIOD_1ST_HALF:
              this.emit("firstPeriodStart", this, event);
              break;
            case PERIOD_2ND_HALF:
              this.emit("secondPeriodStart", this, event);
              break;
            default:
          }
          break;
        case EVENT_PERIOD_END:
          switch (event.Period) {
            case PERIOD_1ST_HALF:
              this.emit("firstPeriodEnd", this, event);
              break;
            case PERIOD_2ND_HALF:
              this.emit("secondPeriodEnd", this, event);
              break;
            default:
          }
          break;

        case EVENT_GOAL:
          this.emit("goal", this, event, team, "regular");
          break;
        case EVENT_FREE_KICK_GOAL:
          this.emit("goal", this, event, team, "freekick");
          break;
        case EVENT_PENALTY_GOAL:
          this.emit("goal", this, event, team, "penalty");
          break;
        case EVENT_OWN_GOAL:
          this.emit("goal", this, event, team, "own");
          break;

        case EVENT_YELLOW_CARD:
          this.emit("card", this, event, team, "yellow");
          break;
        case EVENT_SECOND_YELLOW_CARD_RED:
          this.emit("card", this, event, team, "yellow+yellow");
          break;
        case EVENT_STRAIGHT_RED:
          this.emit("card", this, event, team, "red");
          break;

        case EVENT_FOUL_PENALTY:
          this.emit("penalty", this, event, team);
          break;
        case EVENT_PENALTY_MISSED:
          this.emit("penalty missed", this, event, team);
          break;
        case EVENT_PENALTY_SAVED:
          this.emit("penalty saved", this, event, team);
          break;

        case EVENT_VAR:
          this.emit("var", this, event);
          break;
        default:
      }
    });

    this.events = events;
    this.lastCheck = moment();
  }
}
