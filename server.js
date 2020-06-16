const mongoose = require('mongoose');
const dotenv = require('dotenv');

// this handler should be on top: before any code is executed
// uncaught exceptions - all errors that occured in our synchronous code and were not caught:
// similiar handling as unhandledRejections
process.on('uncaughtException', err => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  // on uncaught exception we actually want to crash our app as the entire node process is in unclean state.
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
  })
  .then(() => console.log('DB connection successful!'));


// behind the scenes heroku will assign some port to this env variable
const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

// each time we get an unhandled rejection, the process object will emit 'unhandledRejection
// su we can subscribe to that event using process.on:
process.on('unhandledRejection', err => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  // we use process.exit(1) to shut down an application. 0 - success, 1 - unhandled rejection,
  // to shut down gracefully, we first close the server, and then exit the process.
  // remember we create a server using app.listen()
  server.close(() => {
    process.exit(1);
  });
});
