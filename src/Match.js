import moment from 'moment';
import { EventEmitter } from 'events';
import { differenceWith, find, filter } from 'lodash';
import Team from './Team';

import { getNow, log, isDev } from './utils';

import {
  ID_GROUP_STAGE,
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
  EVENT_PENALTY_CROSSBAR,
  EVENT_FOUL_PENALTY,
  EVENT_VAR,
  EVENT_SHOOT,
  EVENT_SHOOT_SAVED,
  EVENT_FOUL,
  EVENT_CORNER_SHOT,
  EVENT_FREE_KICK_SHOT,
  EVENT_OFF_SIDE,
  MATCH_STATUS_FINISHED,
  MATCH_STATUS_LIVE,
} from './constants';

export default class Match extends EventEmitter {
  constructor(data) {
    super();

    this.events = [];
    this.lastEmit = getNow();
    this.previousLastEmit = null;
    this.forecasted = false;
    this.lastCheck = getNow();
    this.complete = false;

    this.id = data.IdMatch;
    this.stageId = data.IdStage;
    this.date = moment(data.Date);
    this.status = data.MatchStatus;

    this.homeTeam = data.Home ? new Team(data.Home) : null;
    this.awayTeam = data.Away ? new Team(data.Away) : null;
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

  isGroupStage() {
    return this.getStageId() === ID_GROUP_STAGE;
  }

  resetLastEmit() {
    this.lastEmit = this.previousLastEmit;
  }

  saveLastEmit() {
    this.previousLastEmit = this.lastEmit;
    this.lastEmit = getNow();
  }

  emit(...args) {
    super.emit.apply(this, [...args]);
    this.saveLastEmit();
  }

  shouldHaveStarted(from) {
    if (isDev()) {
      return true;
    }

    if (this.status === MATCH_STATUS_FINISHED) {
      return false;
    }

    const diff = Math.floor(getNow().diff(this.getDate()) / 1000 / 60);

    return diff >= 0 && diff < from;
  }

  getName() {
    return `${this.homeTeam.getName()} / ${this.awayTeam.getName()}`;
  }

  getEvents({
    eventTypes = null, period = null, teamId = null, until = null,
  }) {
    const result = filter(
      this.events,
      event => (teamId ? teamId === event.IdTeam : true)
        && (eventTypes ? eventTypes.indexOf(event.Type) >= 0 : true)
        && (period ? period === event.Period : true)
        && (until ? moment(event.Timestamp).diff(until) <= 0 : true),
    );

    return result;
  }

  getTeam(teamId) {
    return find([this.homeTeam, this.awayTeam], team => team.getId() === teamId) || null;
  }

  getPlayer(playerId) {
    return [this.homeTeam, this.awayTeam].reduce(
      (acc, team) => acc || team.getPlayer(playerId),
      null,
    );
  }

  updateEvents(events) {
    const newEvents = differenceWith(
      events,
      this.events,
      (event1, event2) => event1.EventId === event2.EventId,
    ).filter((event) => {
      const diff = Math.floor(this.lastCheck.diff(event.Timestamp) / 1000 / 60);

      // Il semblerait que des évènements soient rajoutés antérieurement à la timeline,
      // le plus souvent après un arbitrage vidéo. On met donc une valeur assez
      // élevée pour en tenir compte (la VAR prend rarement plus de 5 min).
      return diff <= 5;
    });

    log(`${newEvents.length} new event(s) for ${this.getName()} (${this.getId()})`);

    this.events = events;
    newEvents.forEach((event) => {
      const team = this.getTeam(event.IdTeam);
      const player = this.getPlayer(event.IdPlayer);
      const diffSinceLastEmit = Math.floor(this.lastEmit.diff(event.Timestamp) / 1000 / 60);

      switch (event.Type) {
        case EVENT_MATCH_START:
          this.status = MATCH_STATUS_LIVE;
          this.emit('matchStart', this, event);
          break;
        case EVENT_MATCH_END:
          this.status = MATCH_STATUS_FINISHED;
          this.emit('matchEnd', this, event);
          break;
        case EVENT_PERIOD_START:
          this.emit('periodStart', this, event);
          break;
        case EVENT_PERIOD_END:
          this.emit('periodEnd', this, event);
          break;
        case EVENT_GOAL:
          this.emit('goal', this, event, team, player, 'regular');
          break;
        case EVENT_FREE_KICK_GOAL:
          this.emit('goal', this, event, team, player, 'freekick');
          break;
        case EVENT_OWN_GOAL:
          this.emit('goal', this, event, team, player, 'own');
          break;
        case EVENT_PENALTY_GOAL:
          this.emit('goal', this, event, team, player, 'penalty');
          break;
        case EVENT_PENALTY_MISSED:
          this.emit('penaltyFailed', this, event, team, player);
          break;
        case EVENT_PENALTY_SAVED:
          this.emit('penaltyFailed', this, event, team, player);
          break;
        case EVENT_PENALTY_CROSSBAR:
          this.emit('penaltyFailed', this, event, team, player);
          break;
        case EVENT_YELLOW_CARD:
          this.emit('card', this, event, team, player, 'yellow');
          break;
        case EVENT_SECOND_YELLOW_CARD_RED:
          this.emit('card', this, event, team, player, 'yellow+yellow');
          break;
        case EVENT_STRAIGHT_RED:
          this.emit('card', this, event, team, player, 'red');
          break;
        case EVENT_FOUL_PENALTY:
          this.emit('penalty', this, event, team, player);
          break;
        case EVENT_VAR:
          this.emit('var', this, event);
          break;
        case EVENT_SHOOT:
          this.emit('shoot', this, event, team, player);
          break;
        case EVENT_SHOOT_SAVED:
          this.emit('shootSaved', this, event, team, player);
          break;
        case EVENT_FOUL:
          this.emit('foul', this, event, team, player);
          break;
        case EVENT_CORNER_SHOT:
          this.emit('cornerShot', this, event, team, player);
          break;
        case EVENT_FREE_KICK_SHOT:
          this.emit('freeKickShot', this, event, team, player);
          break;
        default:
          if (diffSinceLastEmit >= 15 || isDev) {
            this.updateSecondaryEvent(event);
          }
      }
    });

    this.lastCheck = moment();
  }

  updateSecondaryEvent(event) {
    if (!event) {
      return;
    }

    const team = this.getTeam(event.IdTeam);
    const player = this.getPlayer(event.IdPlayer);

    switch (event.Type) {
      case EVENT_OFF_SIDE:
        this.emit('offSide', this, event, team, player);
        break;
      /* case SHOOT:
        if (!event.IdSubPlayer) {
          break;
        }
        this.emit('shoot', this, event, team, player);
        // tirs cadrés doivent être suivis d'un évènement
        // sinon on reste sur notre faim ;)
        this.resetLastEmit();
        break; */
      default:
    }
  }
}
