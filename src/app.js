const express = require('express');

const bodyParser = require('body-parser');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const xss = require('xss-clean');
const compression = require('compression');

const appointmentRoutes = require('./routes/appointmentRoutes');

const AppError = require('./utils/appException');
const globalErrorHandler = require('./controller/errorController');

const app = express();

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(helmet());
app.use(cors());
app.options('*', cors());

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message:
    'too many requests from this ip address, please try again in an hour',
});

app.use('/api', limiter);
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(xss());
app.use(compression());

app.use('/api/v1/appointments', appointmentRoutes);

app.all('*', (req, res, next) => {
  next(new AppError(`can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
