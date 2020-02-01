An exercise using these technologies:

* MongoDB
* Express
* React
* NodeJS
* GraphQL

## Database setup instructions

Using [MongoDB Atlas](https://www.mongodb.com/cloud/atlas?jmp=docs):

* Go to the website and create an account
* Click Build a cluster
* Select Amazon Web Services as your cloud provider
* Select the region that geographically closest to you
* Leave everything else as defaults
* Wait for the cluster to be created (7-10 min)
* Click the `Connect` button on the newly created cluster
* Click Add a different IP address and enter `0.0.0.0/0` to allow connections from any IP
* Next create a new user
* Give them whatever username you like I.E. `dev`
* Click the `Autogenerate Secure Password` button and save the password for later
* Click chose a connection method
* Click `Connect Your Application`
* Copy and paste the connection string
* Replace the `<username>` with the username we just created
* Replace the `<password>` with the auto-generated password
* Save connection string in an env var called `MONGO_URI`

## Secret key generator for JWT

Create a random key [here](https://randomkeygen.com/) and save it in an env var called `SECRET_OR_KEY`.
