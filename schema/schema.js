const graphql = require('graphql')
const { Pagination } = require('@limit0/mongoose-graphql-pagination')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const passport = require('passport')
const User = require('../models/User')
const Tweet = require('../models/Tweet')
const validateRegisterInput = require('../validation/register')
const validateLoginInput = require('../validation/login')

const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLBoolean,
  GraphQLSchema,
  GraphQLID,
  GraphQLFloat,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInputObjectType,
  GraphQLError,
} = graphql
const { GraphQLDateTime } = require('graphql-iso-date')

/**
 * @param {Object} args
 * @param {Object} model
 */
const getFilteredOrPaginated = function(args, model) {
  let config = {
    pagination: {},
    sort: {},
    criteria: {},
  }
  if (args.first) config.pagination.first = args.first
  if (args.after) config.pagination.after = args.after

  if (args.sort) {
    let order

    if (args.sort.order === 'ASC') {
      order = 1
    } else if (args.sort.order === 'DESC') {
      order = -1
    }

    config.sort.field = args.sort.field
    config.sort.order = order
  }

  if (args.filter) {
    config.criteria[args.filter.field] = {}
    if (args.filter.eq) {
      config.criteria[args.filter.field].$eq = args.filter.eq
    }

    if (args.filter.ne) {
      config.criteria[args.filter.field].$ne = args.filter.ne
    }
  }

  const paginated = new Pagination(model, config)
  return paginated.getEdges().then(res => {
    return res.map(({ node }) => {
      return node
    })
  })
}

// Based on: https://stackoverflow.com/a/45379297
const auth = (req, res) =>
  new Promise((resolve, reject) => {
    passport.authenticate('jwt', { session: false }, (err, user) => {
      if (err) reject(err)
      if (user) resolve(user)
      else reject('Unauthorized')
    })(req, res)
  })

const UserType = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: {
      type: GraphQLID,
    },
    handle: {
      type: GraphQLString,
    },
    email: {
      type: GraphQLString,
    },
    password: {
      type: GraphQLString,
    },
    date: {
      type: GraphQLDateTime,
    },
    success: {
      type: GraphQLBoolean,
    },
    token: {
      type: GraphQLString,
    },
  }),
})

const TweetType = new GraphQLObjectType({
  name: 'Tweet',
  fields: () => ({
    id: {
      type: GraphQLID,
    },
    userId: {
      type: GraphQLID,
    },
    user: {
      type: UserType,
      resolve(parent, _args) {
        return User.findById(parent.userId)
      },
    },
    text: {
      type: GraphQLString,
    },
    date: {
      type: GraphQLDateTime,
    },
  }),
})

const SortType = new GraphQLInputObjectType({
  name: 'Sort',
  fields: () => ({
    field: {
      type: new GraphQLNonNull(GraphQLString),
    },
    order: {
      type: GraphQLString,
    },
  }),
})

const FilterType = new GraphQLInputObjectType({
  name: 'Filter',
  fields: () => ({
    /**
     * TODO
     * https://docs.mongodb.com/manual/reference/operator/query-comparison/
     */
    field: {
      type: new GraphQLNonNull(GraphQLString),
    },
    eq: {
      type: GraphQLString,
    },
    ne: {
      type: GraphQLString,
    },
  }),
})

const RootQuery = new GraphQLObjectType({
  name: 'RootQueryType',
  fields: {
    user: {
      type: UserType,
      args: {
        id: {
          type: GraphQLID,
        },
      },
      resolve(_parent, args) {
        return User.findById(args.id)
      },
    },
    tweet: {
      type: TweetType,
      args: {
        id: {
          type: GraphQLID,
        },
      },
      resolve(_parent, args) {
        return Tweet.findById(args.id)
      },
    },
    users: {
      type: new GraphQLList(UserType),
      args: {
        first: {
          type: GraphQLFloat,
        },
        after: {
          type: GraphQLString,
        },
        sort: {
          type: SortType,
        },
        filter: {
          type: FilterType,
        },
      },
      resolve(_parent, args) {
        return getFilteredOrPaginated(args, User)
      },
    },
    tweets: {
      type: new GraphQLList(TweetType),
      args: {
        first: {
          type: GraphQLFloat,
        },
        after: {
          type: GraphQLFloat,
        },
        sort: {
          type: SortType,
        },
        filter: {
          type: FilterType,
        },
      },
      resolve(_parent, args) {
        return getFilteredOrPaginated(args, Tweet)
      },
    },
  },
})

const Mutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    /**
     * Register mutation
     */
    register: {
      type: UserType,
      args: {
        handle: {
          type: new GraphQLNonNull(GraphQLString),
        },
        email: {
          type: new GraphQLNonNull(GraphQLString),
        },
        password: {
          type: new GraphQLNonNull(GraphQLString),
        },
        password2: {
          type: new GraphQLNonNull(GraphQLString),
        },
      },
      resolve(_parent, args) {
        const { handle, email, password } = args
        const { errors, isValid } = validateRegisterInput(args)
        return new Promise((res, rej) => {
          if (!isValid) {
            rej()
          }

          User.findOne({ handle }).then(user => {
            if (user) {
              errors.handle = 'User already exists'
              rej()
            } else {
              const newUser = new User({
                handle,
                email,
                password,
              })

              bcrypt.genSalt(10, (_err, salt) => {
                bcrypt.hash(newUser.password, salt, (err, hash) => {
                  if (err) throw new GraphQLError(JSON.stringify(err))
                  newUser.password = hash
                  newUser
                    .save()
                    .then(user => {
                      const payload = { id: user.id, handle: user.handle }

                      jwt.sign(
                        payload,
                        process.env.SECRET_OR_KEY,
                        { expiresIn: 3600 },
                        (_err, token) => {
                          res({
                            id: user.id,
                            handle: user.handle,
                            email: user.email,
                            success: true,
                            token: 'Bearer ' + token,
                          })
                        }
                      )
                    })
                    .catch(err => console.log(err))
                })
              })
            }
          })
        }).catch(() => {
          const keys = Object.keys(errors)
          keys.map(key => {
            throw new GraphQLError(errors[key])
          })
        })
      },
    },
    /**
     * Login mutation
     */
    login: {
      type: UserType,
      args: {
        email: {
          type: new GraphQLNonNull(GraphQLString),
        },
        password: {
          type: new GraphQLNonNull(GraphQLString),
        },
      },
      resolve(_parent, args) {
        const { errors, isValid } = validateLoginInput(args)
        const { email, password } = args
        return new Promise((res, rej) => {
          if (!isValid) {
            rej()
          }

          User.findOne({ email }).then(user => {
            if (!user) {
              errors.email = 'This user does not exist'
              rej()
            }

            bcrypt.compare(password, user.password).then(isMatch => {
              if (isMatch) {
                const payload = { id: user.id, handle: user.handle }

                jwt.sign(
                  payload,
                  process.env.SECRET_OR_KEY,
                  // Tell the key to expire in one hour
                  { expiresIn: 3600 },
                  (_err, token) => {
                    res({
                      id: user.id,
                      handle: user.handle,
                      email: user.email,
                      success: true,
                      token: 'Bearer ' + token,
                    })
                  }
                )
              } else {
                errors.password = 'Incorrect password'
                rej()
              }
            })
          })
        }).catch(() => {
          const keys = Object.keys(errors)
          keys.map(key => {
            throw new GraphQLError(errors[key])
          })
        })
      },
    },
    /**
     * Compose tweet mutation
     */
    composeTweet: {
      type: TweetType,
      args: {
        userId: {
          type: GraphQLID,
        },
        text: {
          type: GraphQLString,
        },
      },
      resolve(_parent, args, request, response) {
        return auth(request, response)
          .then(() => {
            const newTweet = new Tweet({
              userId: args.userId,
              text: args.text,
            })

            return newTweet.save().then(tweet => {
              return tweet
            })
          })
          .catch(err => {
            throw new GraphQLError(JSON.stringify(err))
          })
      },
    },
  },
})

module.exports = new GraphQLSchema({
  query: RootQuery,
  mutation: Mutation,
})
