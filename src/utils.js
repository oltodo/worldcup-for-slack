import moment from 'moment';

export const isDev = () => process.env.NODE_ENV === 'development';

export const getNow = () => {
  if (!isDev()) {
    return moment();
  }

  switch (Math.abs(process.argv[2])) {
    case 7:
      return moment('2017-06-04T09:00:00Z');
    case 6:
      return moment('2017-10-17T17:00');
    case 2:
      return moment('2018-06-19T14:30');
    case 3:
      return moment('2018-06-19T20:30');
    case 4:
      return moment('2018-06-19T17:30');
    case 5:
      return moment('2018-06-21T14:30');
    default:
      return moment('2018-06-18T14:00');
  }
};

export const { log } = console;
