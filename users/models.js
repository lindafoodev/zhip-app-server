'use strict';

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

//userSchema

const userSchema = new mongoose.Schema({
  username: {
		type: String,
		required: true,
		unique: true
	},
	password: {
		type: String,
		required: true
	},
	accountBalance: {type: Number, default: 1000},
	isFirstTimeUser: {type: Boolean, default: true}
});

userSchema.methods.serialize = function() {
  return {
    id: this._id,
    username: this.username,
		accountBalance: this.accountBalance,
		isFirstTimeUser: this.isFirstTimeUser
  };
};

userSchema.methods.validatePassword = function(password) {
	return bcrypt.compare(password, this.password);
};

userSchema.statics.hashPassword = function(password) {
	return bcrypt.hash(password, 10);
};

const User = mongoose.model('User', userSchema);

module.exports = {User};