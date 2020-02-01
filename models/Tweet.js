const mongoose = require('mongoose')
const Schema = mongoose.Schema

const TweetSchema = new Schema({
  userId: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
})

module.exports = Tweet = mongoose.model('tweet', TweetSchema)
