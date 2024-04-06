# Livepeer Payout Bot

Sends an alert to Discord and Twitter anytime an orchestrator gets paid.

## Setup

### Prerequisites

- [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) -
  [NVM](https://github.com/nvm-sh/nvm) is recommended for managing Node
  versions.
- [MongoDB](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/)
- [Vercel CLI](https://vercel.com/docs/cli)

### Local Development

1. Create a local MongoDB database called `livepeer-payout-bot`:

   ```bash
   mongosh
   use livepeer-payout-bot
   ```

2. Create a user with read and write access to the `livepeer-payout-bot`
   database:

   ```bash
   db.createUser({
       user: "livepeer-payout-bot",
       pwd: "password",
       roles: ["readWrite"]
   })
   ```

3. To send alerts to a specific channel, create a
   [Discord webhook](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks).
4. Install dependencies with `npm install`.
5. Rename the `.env.example` file to `.env` and fill in the required environment
   variables:

   ```bash
   MONGO_USERNAME=                         # Database username
   MONGO_PASSWORD=                         # Database password
   MONGO_HOST=cluster0.eutpy.mongodb.net   # Database host
   MONGO_DB=                               # Database name
   DISCORD_WEBHOOK_URL=                    # Discord webhook url
   API_TOKEN=                              # Bearer Token for API
   INFURA_KEY=                             # Infura API Key
   NODE_ENV=                               # Environment (development, production)
   ```

   The `NODE_ENV` variable should be set to `development` if you are using a
   local MongoDB database.

6. Run the bot with `npm run dev`.

### Deployment

1. Follow stp 1-4 from the [local development setup guide](#local-development).
2. Create an [Vercel account](https://vercel.com/signup).
3. Create a [Infura](https://infura.io/) or [Alchemy](https://www.alchemy.com/)
   account and get an API key.
4. Create a [Atlas](https://www.mongodb.com/cloud/atlas) account and
   [create a new cluster](https://www.mongodb.com/docs/atlas/tutorial/create-new-cluster/).
5. Create a
   [new database user](https://www.mongodb.com/docs/atlas/security-add-mongodb-users/)
   with read and write access to the `livepeer-payout-bot` database.
6. Create a new database called `livepeer-payout-bot` in the cluster.
7. To send alerts to a specific channel, create a
   [Discord webhook](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks).
8. Rename the `.env.example` file to `.env` and fill in the required environment
   variables:

   ```bash
   MONGO_USERNAME=                         # Database username
   MONGO_PASSWORD=                         # Database password
   MONGO_HOST=cluster0.eutpy.mongodb.net   # Database host
   MONGO_DB=                               # Database name
   DISCORD_WEBHOOK_URL=                    # Discord webhook url
   API_TOKEN=                              # Bearer Token for API
   INFURA_KEY=                             # Infura API Key
   NODE_ENV=                               # Environment (development, production)
   ```

   The `NODE_ENV` variable should be set to `development` if you are using a
   local MongoDB database.

9. Deploy the bot with `vercel`.
10. Setup a [Vercel cron job](https://vercel.com/docs/solutions/cron-jobs) to
    run the bot every 5 minutes.
