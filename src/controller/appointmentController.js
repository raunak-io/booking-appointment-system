const db = require('../configuration/firebase/firebase');
const moment = require('moment-timezone');
const AppError = require('./../utils/appException');

const startHour = 10; // 10 AM
const endHour = 17; // 5 PM
const slotDuration = 30; // 30 minutes
const defaultTimezone = 'America/Los_Angeles';

const generateSlots = (date, timezone) => {
  const slots = [];
  const start = moment.tz(date, timezone).hour(startHour).minute(0).second(0);
  const end = moment.tz(date, timezone).hour(endHour).minute(0).second(0);

  while (start < end) {
    slots.push(start.clone().toISOString());
    start.add(slotDuration, 'minutes');
  }
  return slots;
};

exports.createEvent = async (req, res, next) => {
  try {
    const { dateTime, duration } = req.body;
    const dateValue = new Date(dateTime).toISOString().split('T');
    // const start = moment
    //   .tz(dateValue[0], timezone)
    //   .hour(startHour)
    //   .minute(0)
    //   .second(0);
    // const end = moment
    //   .tz(dateTime[0], timezone)
    //   .hour(endHour)
    //   .minute(0)
    //   .second(0);
    console.log(
      // 'start and end date here ----',
      // start,
      // 'end --',
      // end,
      'date val --',
      dateValue,
    );

    const eventRef = db.collection('events').doc(`${dateTime}`);
    const eventDoc = await eventRef?.get();
    console.log('eventDoc ---', eventDoc.data());

    if (eventDoc?.exists) {
      next(new AppError('Slot already booked', 422));
    }

    // await eventRef.set({ dateTime, duration });

    res.status(200).json({ message: 'createEvent called successfully' });
  } catch (e) {
    next(e);
  }
};

exports.getFreeSlots = async (req, res, next) => {
  try {
    const { date, timezone = defaultTimezone } = req.query;

    const slots = generateSlots(date, timezone);

    const eventsSnapshot = await db
      .collection('events')
      .where('date', '==', date)
      .get();
    const bookedSlots = eventsSnapshot.docs.map((doc) =>
      moment(doc.data().dateTime).tz(tz).toISOString(),
    );

    const freeSlots = slots.filter((slot) => !bookedSlots.includes(slot));

    res.json(freeSlots);
  } catch (e) {
    next(e);
  }
};

exports.getEvents = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    console.log('startDate --', startDate, 'end date --', endDate);

    const start = new Date(startDate).toISOString(),
      end = new Date(endDate).toISOString();
    const eventsSnapshot = await db
      .collection('events')
      .where('dateTime', '>=', start)
      .where('dateTime', '<=', end)
      .get();

    const events = eventsSnapshot.docs.map((doc) => doc.data());
    res.json(events);
  } catch (e) {
    next(e);
  }
};
