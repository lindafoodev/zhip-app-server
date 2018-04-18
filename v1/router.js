//future build - if user logged in (find by username, get id, however, id not displayed to user, using id - then can update transaction and send info)

'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const { Transaction } = require('./models');
const { User } = require('../users/models');
const { localStrategy, jwtStrategy } = require('../auth/strategies');
const router = express.Router();
const jsonParser = bodyParser.json();

passport.use(localStrategy);
passport.use(jwtStrategy);

const jwtAuth = passport.authenticate('jwt', { session: false });

//see all transactions for testing - server side only - run through postman or localhost: 8080
router.get('/transactions', (req, res) => {
  Transaction.find({})
      .then(transaction => {
          res.json(transaction);
      })
      .catch(err =>{
          console.error(err);
          res.status(500).json({message: 'Internal Server Error'});
      }); //error handler
});

//sending user inputs userIdInitiator and transactionAmount => capture via req.body, user intentionally not required to login
router.post('/transaction/send', jsonParser, (req, res) => {
  /***** Never trust users - validate input *****/
  const requiredFields = ['transactionAmount', 'userIdInitiator'];
  
  const missingFields = requiredFields.filter(field => !(field in req.body)); 

  const { transactionAmount, userIdInitiator  } = req.body;

  const intAmount = parseInt(transactionAmount, 10);

  const newTransaction = {userIdInitiator, transactionAmount: intAmount};

  User.findById(userIdInitiator)
      .then(account => {
          if((parseInt(account.accountBalance, 10) > 0) && (parseInt(account.accountBalance, 10) >= intAmount)) { //checks that user has enough in account balance to perform transaction
              Transaction.create(newTransaction)
                  .then(sendAmount => {
                      if (sendAmount) {
                      res.json(sendAmount);
                      }
                  })
              }   
          else {
          res.status(404).end(); // 404 handler
          }
      })
  .catch(err => {
      res.status(500).send({message: 'Internal Server Error'});
  }); // error handler
});

//updates transaction to reflect claim to IOU by claiming user, user intentionally not required to login
router.put('/transaction/receive/:transactionId', jsonParser , (req, res) => {
  const transId = req.params.transactionId;
  const id = req.body.userIdClaimer;

  const requiredFields = ['userIdClaimer'];

  const missingFields = requiredFields.filter(field => !(field in req.body));
      Transaction.findById(transId)
          .then(transaction => {
              if (transaction && !(transaction.isIOUClaimed) && (transaction.userIdInitiator !== id)) {
              Transaction.findByIdAndUpdate(transId, {userIdClaimer: id, isIOUClaimed: true}, {new: true})
                  .then(completedTransaction => {
                  if (completedTransaction) {
                      res.json(completedTransaction);
                  }
                  })
              }
              else {
                  res.status(404).end(); // 404 handler
              }
      })
      .catch(err => {
          res.status(500).send({message: 'Internal Server Error'}); // error handler
      });
}); 

//updates claiming user account based on addition of IOU credit, user intentionally not required to be logged in
router.put('/account/receive/:transactionId', (req, res) => {
  const id = req.body.userIdClaimer;
  //have to find const amount = req.body.transactionAmount;
  const transId = req.params.transactionId;

   /***** Never trust users - validate input *****/
  const requiredFields = ['userIdClaimer'];

  const missingFields = requiredFields.filter(field => !(field in req.body));

  Transaction.findById(transId)
      .then(transaction => {
          if(transaction) {
              const transAmount = parseInt(transaction.transactionAmount, 10);
              User.findById(id)
                  .then(account => {
                      let newBalance = parseInt(account.accountBalance, 10) + transAmount;
                      User.findByIdAndUpdate(id, {accountBalance: newBalance}, {new: true})
                          .then( update => { 
                              if (update) {
                              res.json(update); 
                              }
                              else {
                                  res.status(404).end(); // 404 handler
                              }
                          })       
                  })
          }
          else {
              res.status(404).end(); // 404 handler
          }
      })
  .catch(err => {
      res.status(500).send({message: 'Internal Server Error'}); // error handler
  });
});

//see all transactions info for user, user required to be logged in
router.get('/activity', jwtAuth, (req, res) => {
  const userId = req.user.id;

  Transaction.find({ $or: [{userIdInitiator: userId}, {userIdClaimer: userId}]})
      .then(transactions => {
          if (transactions) {
              res.json(transactions);
          }
          else {
              res.status(404).end(); //404 handler
          }
      })
      .catch(err =>{
          console.error(err);
          res.status(500).json({message: 'Internal Server Error'}); // error handler
      }); //error handler
});

//get one users balance, user required to be logged in
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
  
//updates sending users account to reflect deduction based on IOU amount, user intentionally not required to be logged in
router.put('/account/send', jsonParser, (req, res) => {
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

module.exports = { router };