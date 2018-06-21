import moment from "moment";

export const IS_DEV = process.env.NODE_ENV === "development";

export const getNow = () => {
  return IS_DEV ? moment("2018-06-18T14:00") : moment();
};
