import moment from "moment";
import { EventEmitter } from "events";
import { differenceWith, find, filter } from "lodash";
import Team from "./Team";

import { getNow, IS_DEV } from "./utils";

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
    return IS_DEV ? false : this.status === MATCH_STATUS_LIVE;
  }

  isComplete() {
    return this.complete;
  }

  shouldHaveStarted(from) {
    if (this.status === MATCH_STATUS_FINISHED && !IS_DEV) {
      return false;
    }
    //console.log("ID : " + this.getId() + "  " + new Date(getNow()) + " -> " + new Date(this.getDate()) + "IS LIVE : "+this.isLive() + " DIFF " + Math.floor(getNow().diff(this.getDate()) / 1000 / 60) + " COMPLETE " + this.isComplete());
    const diff = Math.floor(getNow().diff(this.getDate()) / 1000 / 60);

    return diff >= 0 && diff < from;
  }

  getName() {
    return `${this.homeTeam.getName()} / ${this.awayTeam.getName()}`;
  }

  getEvents({ eventTypes = null, period = null, teamId = null }) {
    let result = filter(
      this.events,
      event =>
        (teamId ? teamId === event.IdTeam : 1) &&
        (eventTypes ? eventTypes.indexOf(event.Type) >= 0 : 1) &&
        (period ? period === event.Period : 1)
    );
    return result;
  }

  updateEvents(events) {
    const newEvents = differenceWith(
      events,
      this.events,
      (event1, event2) => event1.EventId === event2.EventId
    ).filter(event => {
      const diff = Math.floor(this.lastCheck.diff(event.Timestamp) / 1000 / 60);
      return diff <= 1;
    });

    console.log(
      `${newEvents.length} new event(s) for match ID ${this.getId()}`
    );

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
          this.emit("periodStart", this, event);
          break;
        case EVENT_PERIOD_END:
          this.emit("periodEnd", this, event);
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
        default:
      }
    });

    this.events = events;
    this.lastCheck = moment();
  }
}
