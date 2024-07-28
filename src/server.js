const dotenv = require('dotenv');

process.on('uncaught Exception', err => {
    console.log('uncaught exception shutting down ...');
    console.log(err.name, err.message);
    process.exit(1);
  });

  dotenv.config({ path: './config.env' });

const app = require('./app');

console.log(app.get('env'));


const port = process.env.PORT || 3000;
const host = process.env.HOST ||'0.0.0.0';
const server = app.listen(port,host, () => {
  console.log(`server is listening on port : ${port} `);
});

process.on('uncaught rejection', err => {
  console.log('uncaught rejection shutting down');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});