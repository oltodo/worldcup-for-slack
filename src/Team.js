import { get, find } from "lodash";
import { COUNTRIES } from "./constants";

export default class Team {
  constructor(data) {
    this.data = data;
  }

  getId() {
    return this.data.IdTeam;
  }

  getCountryId() {
    return get(this.data, "IdCountry", "DEF");
  }

  getName(flag = false, flagPositionInverted = false) {
    const name = get(this.data, "TeamName.0.Description", "Unknown");

    if (flag) {
      return flagPositionInverted? `${this.getFlag()} ${name}` :  `${name} ${this.getFlag()}`;
    }

    return name;
  }

  getNameWithDeterminer(prefix = null, flag = false) {
    const name = this.getName(flag);

    let determiner = COUNTRIES[this.getCountryId()]["determiner"];

    switch (prefix) {
      case "à":
        determiner = `à ${determiner}`;
        break;
      case "de":
        determiner = `de ${determiner}`;
        break;
      default:
    }

    if (determiner === "de le ") {
      determiner = "du ";
    }

    if (determiner === "à le ") {
      determiner = "au ";
    }

    return `${determiner}${name}`;
  }

  getFlag() {
    return COUNTRIES[this.getCountryId()]["flag"];
  }

  getPlayerName(playerId, flag = false) {
    const player = find(this.data.Players, { IdPlayer: playerId });
    const name = get(player, "ShortName.0.Description", "Inconnu");

    if (flag) {
      return `${name} ${this.getFlag()}`;
    }

    return name;
  }
}
