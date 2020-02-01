require('dotenv').config()

const mongoose = require('mongoose')
const faker = require('faker')
const bcrypt = require('bcryptjs')
const User = require('./models/User')
const Tweet = require('./models/Tweet')
const db = process.env.MONGO_URI

const NUMBER_OF_USERS = 50

mongoose
  .connect(db, { useNewUrlParser: true })
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch(err => console.log(err))

let i = 0
while (i <= NUMBER_OF_USERS) {
  i++
  const handle = faker.internet.userName()
  const email = faker.internet.email()
  const password = faker.internet.password()
  bcrypt.genSalt(10, (_err, salt) => {
    bcrypt.hash(password, salt, (err, hash) => {
      if (err) throw err
      const newUser = new User({
        handle,
        email,
        password: hash,
      })
      newUser
        .save()
        .then(user => {
          console.log('Creating tweets for user: ', user.handle)
          const numOfTweets = Math.random() * (30 - 5) + 5
          let i = 0
          while (i <= numOfTweets) {
            i++
            const text = faker.lorem.sentences(3).substring(0, 140)
            const newTweet = new Tweet({
              text,
              // user: user.id,
              userId: user.id,
            })

            newTweet.save().catch(err => console.log(err))
          }
        })
        .catch(err => console.log(err))
    })
  })
}
