const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const {DATABASE_URL} = require('./config');

function dbConnect(url = DATABASE_URL) {
    console.log('dbConnect is being called');
    console.log('db url is', url);
    return mongoose.connect(url, {useMongoClient: true}).catch(err => {
        console.error('Mongoose failed to connect');
        console.error(err);
    });
}

function dbDisconnect() {
    return mongoose.disconnect();
}

function dbGet() {
    return mongoose;
}

module.exports = {
    dbConnect,
    dbDisconnect,
    dbGet
};
