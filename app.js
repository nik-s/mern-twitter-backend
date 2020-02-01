/**
 * TODO:
 *
 * https://levelup.gitconnected.com/building-your-graphql-api-with-node-and-mongodb-799a2b9ae0b4
 */

require('dotenv').config()

const express = require('express')
const app = express()
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const passport = require('passport')
const db = process.env.MONGO_URI
const users = require('./routes/api/users')
const tweets = require('./routes/api/tweets')
const cors = require('cors')
const graphqlHTTP = require('express-graphql')
const schema = require('./schema/schema')

require('./config/passport')(passport)

mongoose
  .connect(db, { useNewUrlParser: true })
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch(err => console.log(err))

// REVIEW
if (process.env.NODE_ENV === 'development') {
  app.use(cors())
}

app.use(
  '/graphql',
  // passport.authenticate('jwt', { session: false }),
  graphqlHTTP({
    schema,
    graphiql: true,
  })
)

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(passport.initialize())

app.use('/api/users', users)
app.use('/api/tweets', tweets)

const port = process.env.PORT || 5000

app.listen(port, () => console.log(`Server is running on port ${port}`))
