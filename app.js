var createError = require('http-errors');
var express = require('express');
var cors = require('cors');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const { PostHog } = require('posthog-node');


//configure cors 
const corsOptions = {
  origin: 'http://10.0.1.20:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

const posthog = new PostHog(
  'phc_xC1fBU65c02AaFCisiKximyPseHTHIUGSRwtQayUXs0',
  { host: 'https://eu.i.posthog.com' }
);

var todosRouter = require('./routes/todos');

var app = express();
//app.use(cors());
app.use(cors(corsOptions)); //use cors with the corsoptions set above

// view engine setup
app.set('views', path.join(__dirname, 'views'));
// jade or pug
// app.set('view engine', 'jade');
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/todos', todosRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  next(createError(err.status || 500));
});

module.exports = app;
