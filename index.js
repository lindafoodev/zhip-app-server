'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('passport');
const {PORT, CLIENT_ORIGIN} = require('./config');
const {dbConnect} = require('./db-mongoose');
const app = express();

const { router: usersRouter } = require('./users');
const { router: authRouter } = require('./auth');
const { router: v1Router } = require('./v1');
const {localStrategy, jwtStrategy} = require('./auth/strategies');


app.use(
  morgan(process.env.NODE_ENV === 'production' ? 'common' : 'dev', {
    skip: (req, res) => process.env.NODE_ENV === 'test',
  })
);

app.use(
  cors({
    origin: CLIENT_ORIGIN,
  })
);

passport.use(localStrategy);
passport.use(jwtStrategy);

app.use('/api/users/', usersRouter);
app.use('/api/auth/', authRouter);
app.use('/api/v1/', v1Router);

const jwtAuth = passport.authenticate('jwt', {session: false});

app.get('/api/protected', jwtAuth, (req, res) => {
	return res.json({
				data: 'popcorn'
			}); 
});

function runServer(port = PORT) {
  const server = app
    .listen(port, () => {
      console.info(`App listening on port ${server.address().port}`);
    })
    .on('error', (err) => {
      console.error('Express failed to start');
      console.error(err);
    });
}

if (require.main === module) {
  dbConnect();
  runServer();
}

module.exports = {app};





// 'use strict';
// require('dotenv').config();
// const express = require('express');
// const mongoose = require('mongoose');
// const morgan = require('morgan');
// const passport = require('passport');
// const { router: usersRouter } = require('./users');
// const { router: authRouter, localStrategy, jwtStrategy } = require('./auth');
// const { router: v1Router } = require('./v1');
// const {dbConnect} = require('./db-mongoose');

// mongoose.Promise = global.Promise;

// const { PORT, DATABASE_URL } = require('./config');

// const app = express();

// // Logging
// app.use(morgan('common'));

// // CORS
// app.use(function (req, res, next) {
// 	res.header('Access-Control-Allow-Origin', '*');
// 	res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
// 	res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE');
// 	if (req.method === 'OPTIONS') {
// 		return res.sendStatus(204);
// 	}
// 	next();
// });

// passport.use(localStrategy);
// passport.use(jwtStrategy);

// app.use('/api/users/', usersRouter);
// app.use('/api/auth/', authRouter);
// app.use('/api/v1/', v1Router);

// const jwtAuth = passport.authenticate('jwt', { session: false });
// // A protected endpoint which needs a valid JWT to access it
// app.get('/api/protected', jwtAuth, (req, res) => {
// 	return res.json({
// 		data: 'rosebud'
// 	}); 
// });


// app.use('*', (req, res) => {
// 	return res.status(404).json({ message: 'Not Found' });
// });

// // Referenced by both runServer and closeServer. closeServer
// // assumes runServer has run and set `server` to a server object
// let server;

// function runServer(databaseUrl = DATABASE_URL, port = PORT) {
// 	return new Promise((resolve, reject) => {
// 		mongoose.connect(databaseUrl, { useMongoClient: true }, err => {
// 			if (err) {
// 				return reject(err);
// 			}
// 			server = app.listen(port, () => {
// 				console.log(`Your app is listening on port ${port}`);
// 				resolve(server);
// 			})
// 				.on('error', err => {
// 					mongoose.disconnect();
// 					reject(err);
// 				});
// 		});
// 	});
// }

// // this function closes the server, and returns a promise. we'll
// // use it in our integration tests later.
// function closeServer() {
// 	return new Promise((resolve, reject) => {
// 		mongoose.disconnect();
// 		console.log('Closing server');
// 		server.close(err => {
// 			console.error(err);
// 			if (err) {
// 				return reject(err);
// 			}
// 			resolve();
// 		});
// 	})
// 		.catch(err =>{
// 			return console.log(err);
// 		});
// }


// // if server.js is called directly (aka, with `node server.js`), this block
// // runs. but we also export the runServer command so other code (for instance, test code) can start the server as needed.
// if (require.main === module) {
// 	runServer().catch(err => console.error(err));
// }

// module.exports = { app, runServer, closeServer };
