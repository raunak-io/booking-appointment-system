const express = require('express');

const appointmentController = require('./../controller/appointmentController');

const router = express.Router();

router.route('/free-slots').get(appointmentController.getFreeSlots);

router.route('/events').get(appointmentController.getEvents);

router.route('/create-event').post(appointmentController.createEvent);

module.exports = router;
