const db = require('../configuration/firebase/firebase');
const moment = require('moment-timezone');

const startHour = 8; // 10 AM
const endHour = 17; // 5 PM
const slotDuration = 30; // 30 minutes
const defaultTimezone = 'US/Eastern';

const generateSlots = (date, timezone) => {
  const slots = [];

  let start = moment
    .tz(date, defaultTimezone)
    .hour(startHour)
    .minute(0)
    .second(0);
  let end = moment.tz(date, defaultTimezone).hour(endHour).minute(0).second(0);
  if (defaultTimezone != timezone) {
    start = start.tz(timezone);
    end = end.tz(timezone);
  }
  while (start < end) {
    slots.push(start.format());
    start.add(slotDuration, 'minutes');
  }

  return slots;
};

const availableSlots = (dateSlots, allocatedSlots, timezone) => {
  const unavailableSlots = new Set();

  allocatedSlots.forEach((slot) => {
    const startTime = moment.tz(slot.slotDateTime, timezone);
    const endTime = startTime.clone().add(slot.duration, 'minutes');

    for (
      let time = startTime.clone().startOf('minute');
      time.isBefore(endTime);
      time.add(30, 'minutes')
    ) {
      let clonedTime = time.clone();
      if (clonedTime.minutes() < slotDuration) {
        clonedTime.set({ minutes: 0 });
      } else if (clonedTime.minutes() > slotDuration) {
        clonedTime.set({ minutes: slotDuration });
      }

      unavailableSlots.add(clonedTime.format());
    }
  });

  const availableSlots = dateSlots.filter(
    (slot) => !unavailableSlots.has(slot),
  );

  return availableSlots.map((slot) =>
    moment.tz(slot, timezone).format('YYYY-MM-DDTHH:mm:ss'),
  );
};

const isOverlapping = (startTime, endTime, events) => {
  return events.some((event) => {
    const eventStart = moment(event.dateTime);
    const eventEnd = moment(event.dateTime).add(event.duration, 'minutes');
    return startTime.isBefore(eventEnd) && endTime.isAfter(eventStart);
  });
};

exports.createEvent = async (req, res, next) => {
  try {
    const { dateTime, duration = slotDuration } = req.body;
    const eventStart = moment.tz(dateTime, defaultTimezone);
    const eventEnd = moment
      .tz(dateTime, defaultTimezone)
      .add(duration, 'minutes');

    if (
      eventStart.hour() < startHour ||
      eventEnd.hour() > endHour ||
      (eventEnd.hour() === endHour && eventEnd.minute() > 0)
    ) {
      return res
        .status(422)
        .json({ message: 'Selected time is out of availability hours' });
    }

    const eventsSnapshot = await db
      .collection('events')
      .where('eventDate', '==', eventStart.format('YYYY-MM-DD'))
      .get();
    const events = eventsSnapshot.docs.map((doc) => doc.data());

    if (isOverlapping(eventStart, eventEnd, events)) {
      return res.status(422).json({
        message: 'Selected time slot overlaps with an existing event',
      });
    }
    const defaultZoneEventDate = eventStart.clone().format();
    const eventRef = db.collection('events').doc(defaultZoneEventDate);
    await eventRef.set({
      dateTime: defaultZoneEventDate,
      duration,
      eventDate: eventStart.format('YYYY-MM-DD'),
    });
    res.status(200).json({ message: 'Event created successfully' });
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
      .where('eventDate', '==', date)
      .get();

    const bookedSlots = eventsSnapshot.docs.map((doc) => {
      let slotDate = doc.data().dateTime;
      if (timezone != defaultTimezone) {
        const timeInOriginalTimezone = moment.tz(slotDate, defaultTimezone);

        const timeInTargetTimezone = timeInOriginalTimezone
          .clone()
          .tz(timezone);

        slotDate = timeInTargetTimezone.format();
      }
      return {
        slotDateTime: slotDate,
        duration: doc.data().duration,
      };
    });

    const freeSlots = availableSlots(slots, bookedSlots, timezone);

    res.json(freeSlots);
  } catch (e) {
    next(e);
  }
};

exports.getEvents = async (req, res, next) => {
  try {
    const { startDate = new Date(), endDate = new Date() } = req.query;

    const start = moment.tz(startDate, defaultTimezone).format(),
      end = moment.tz(endDate, defaultTimezone).format();
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
