'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');

const { User } = require('./models');
const { localStrategy, jwtStrategy } = require('../auth/strategies');

const router = express.Router();

const jsonParser = bodyParser.json();

passport.use(localStrategy);
passport.use(jwtStrategy);

const jwtAuth = passport.authenticate('jwt', { session: false });

// Post to register a new user
router.post('/', jsonParser, (req, res) => {
	console.log('Enter users/ POST ', req.body);
	const requiredFields = ['username', 'password'];
	const missingField = requiredFields.find(field => !(field in req.body));

	if (missingField) {
		return res.status(422).json({
			code: 422,
			reason: 'ValidationError',
			message: 'Missing field',
			location: missingField
		});
	}

	const stringFields = ['username', 'password'];
	const nonStringField = stringFields.find(
		field => field in req.body && typeof req.body[field] !== 'string'
	);

	if (nonStringField) {
		return res.status(422).json({
			code: 422,
			reason: 'ValidationError',
			message: 'Incorrect field type: expected string',
			location: nonStringField
		});
	}

	// If the username and password aren't trimmed we give an error.  Users might
	// expect that these will work without trimming (i.e. they want the password
	// "foobar ", including the space at the end).  We need to reject such values
	// explicitly so the users know what's happening, rather than silently
	// trimming them and expecting the user to understand.
	// We'll silently trim the other fields, because they aren't credentials used
	// to log in, so it's less of a problem.
	const explicityTrimmedFields = ['username', 'password'];
	const nonTrimmedField = explicityTrimmedFields.find(
		field => req.body[field].trim() !== req.body[field]
	);

	if (nonTrimmedField) {
		return res.status(422).json({
			code: 422,
			reason: 'ValidationError',
			message: 'Cannot start or end with whitespace',
			location: nonTrimmedField
		});
	}

	const sizedFields = {
		username: {
			min: 1
		},
		password: {
			min: 10,
			// bcrypt truncates after 72 characters, so let's not give the illusion
			// of security by storing extra (unused) info
			max: 72
		}
	};
	const tooSmallField = Object.keys(sizedFields).find(
		field =>
			'min' in sizedFields[field] &&
            req.body[field].trim().length < sizedFields[field].min
	);
	const tooLargeField = Object.keys(sizedFields).find(
		field =>
			'max' in sizedFields[field] &&
            req.body[field].trim().length > sizedFields[field].max
	);

	if (tooSmallField || tooLargeField) {
		return res.status(422).json({
			code: 422,
			reason: 'ValidationError',
			message: tooSmallField
				? `Must be at least ${sizedFields[tooSmallField]
					.min} characters long`
				: `Must be at most ${sizedFields[tooLargeField]
					.max} characters long`,
			location: tooSmallField || tooLargeField
		});
	}

	let {username, password} = req.body;

	// Username and password come in pre-trimmed, otherwise we throw an error
	// before this
	console.log(req.body);
	return User.find({username})
		.count()
		.then(count => {
			if (count > 0) {
				// There is an existing user with the same username
				return Promise.reject({
					code: 422,
					reason: 'ValidationError',
					message: 'Username already taken',
					location: 'username'
				});
			}
			// If there is no existing user, hash the password
			return User.hashPassword(password);
		})
		.then(hash => {
			return User.create({
				username,
				password: hash,
				accountBalance: 1000
			});
		})
		.then(user => {
      if(user) {
			console.log('user back from create = ', user);
      return res.status(201).json(user.serialize());
      }
		})
		.catch(err => {
			console.log('error back from create user = ', err);
			// Forward validation errors on to the client, otherwise give a 500
			// error because something unexpected has happened
			if (err.reason === 'ValidationError') {
				return res.status(err.code).json(err);
			}
			res.status(500).json({code: 500, message: 'Internal server error'});
		});
});

// router.get('/:id', jwtAuth, (req, res) => {
// 	//by id
// 	let id = req.params.id;
// 	if (req.params.id === 'self'){
// 	  id = req.user.id;
// 	  console.log(req.user);
// 	}
// 	return User.findById(id)
// 		.then(user => {
// 			console.log(user);
// 			res.json(user);
// 		})
// 		.catch(err => res.status(500).json({message: 'Internal server error'}));
// });

//see all users for testing - server side only - run through postman or localhost: 8080
router.get('/users', (req, res) => {
  User.find({})
     .then(user => {
          res.json(user);
     })
     .catch(err =>{
         console.error(err);
         res.status(500).json({message: 'Internal Server Error'});
     }); //error handler
});

//get one users balance
router.get('/balance', jwtAuth, (req, res) => {
  const userId =  req.user.id;

  User.findById(userId)
     .then(user => {
          res.json(user);
     })
     .catch(err =>{
         console.error(err);
         res.status(500).json({message: 'Internal Server Error'});
     }); //error handler
});

//updates sending users account to reflect deduction based on IOU amount
router.put('/account/send', jsonParser, jwtAuth, (req, res) => {
  const id = req.body.userIdInitiator;
  const amount = req.body.transactionAmount;

   /***** Never trust users - validate input *****/
  const requiredFields = ['userIdInitiator', 'transactionAmount'];

  const missingFields = requiredFields.filter(field => !(field in req.body));

  User.findById(id)
      .then(account => {
          if (parseInt(account.accountBalance, 10) >= parseInt(amount, 10)) { 
          let newBalance = parseInt(account.accountBalance, 10) - parseInt(amount, 10);
              User.findByIdAndUpdate(id, {accountBalance: newBalance}, {new: true})
                  .then( update => { 
                      if (update) {
                      res.json(update); 
                      }
                      else {
                          res.status(404).end(); // 404 handler
                      }
                  })
              }
          else {
              res.status(404).end(); // 404 handler
          }
      })
  .catch(err => {
      res.status(500).send({message: 'Internal Server Error'});
  });  // error handler
});

module.exports = {router};
