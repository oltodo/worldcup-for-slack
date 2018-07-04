import { get, reduce, size } from 'lodash';
import { COUNTRIES } from './constants';

export default class Team {
  constructor(data) {
    this.id = data.IdTeam;
    this.countryId = get(data, 'IdCountry', 'DEF');
    this.name = get(data, 'TeamName.0.Description', 'Unknown');

    this.players = reduce(
      data.Players,
      (acc, player) => {
        const name = get(player, 'PlayerName.0.Description', 'Inconnu');

        return {
          ...acc,
          [player.IdPlayer]: {
            name,
            nameWithFlag: `${name} ${this.getFlag()}`,
            isGoalKeeper: player.Position === 0,
          },
        };
      },
      {},
    );
  }

  getId() {
    return this.id;
  }

  getCountryId() {
    return this.countryId;
  }

  getName(flag = false, flagPositionInverted = false) {
    if (flag) {
      return flagPositionInverted
        ? `${this.getFlag()} ${this.name}`
        : `${this.name} ${this.getFlag()}`;
    }

    return this.name;
  }

  getNameWithDeterminer(prefix = null, flag = false) {
    const name = this.getName(flag);

    let { determiner } = COUNTRIES[this.getCountryId()];

    switch (prefix) {
      case 'à':
        determiner = `à ${determiner}`;
        break;
      case 'de':
        determiner = `de ${determiner}`;
        break;
      default:
    }

    if (determiner === 'de le ') {
      determiner = 'du ';
    }

    if (determiner === 'à le ') {
      determiner = 'au ';
    }

    return `${determiner}${name}`;
  }

  getFlag() {
    return COUNTRIES[this.getCountryId()].flag;
  }

  getPlayer(playerId) {
    return get(this.players, playerId, null);
  }

  hasPlayers() {
    return size(this.players) > 0;
  }
}
