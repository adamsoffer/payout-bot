# Livepeer Payout Bot

![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen) 
![Yarn](https://img.shields.io/badge/yarn-%3E%3D1.22.0-blue)

Sends an alert to Discord and Twitter anytime an orchestrator gets paid.

## Setup

### Prerequisites

- [Node.js 20.x](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) (includes npm)
- [Yarn](https://yarnpkg.com/getting-started/install)
- [MongoDB](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/)
- [Vercel CLI](https://vercel.com/docs/cli)
- [A Graph API key](https://thegraph.com/docs/developer/quick-start#request-api-key)

> [!IMPORTANT]
> The [hosted Livepeer subgraph](https://thegraph.com/hosted-service/subgraph/livepeer/livepeer) has been deprecated. This bot now utilizes the [Livepeer subgraph](https://thegraph.com/explorer/subgraphs/FE63YgkzcpVocxdCEyEYbvjYqEf2kb1A6daMYRxmejYC?view=Query&chain=arbitrum-one) on The Graph for data retrieval from the Livepeer network. To access this service, you will need an API key and an account with sufficient GRT tokens for queries.

> [!TIP]
> Use `nvm install` or `asdf install` to automatically switch to the correct versions.

### Local Development

1. Ensure MongoDB is running:

   ```bash
   sudo systemctl start mongod
   ```

2. To send alerts to a specific Discord channel, create a
   [Discord webhook](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks)
   for that channel.
3. Install dependencies with `yarn install`.
4. Rename the `.env.example` file to `.env` and fill in the required environment
   variables:

   ```bash
   DISCORD_WEBHOOK_URL=                    # Discord webhook url
   API_TOKEN=                              # Bearer Token for API
   INFURA_KEY=                             # Infura API Key
   GRAPH_API_KEY=                          # The Graph API Key
   NODE_ENV=development                    # Environment (development, production)
   ```

   The `NODE_ENV` variable should be set to `development` if you are using a
   local MongoDB database.

5. Run the bot with `vercel dev`.

### Deployment

1. Create an [Vercel account](https://vercel.com/signup).
2. Create a [Infura](https://infura.io/) or [Alchemy](https://www.alchemy.com/)
   account and get an API key.
3. Create a [Atlas](https://www.mongodb.com/cloud/atlas) account and
   [create a new cluster](https://www.mongodb.com/docs/atlas/tutorial/create-new-cluster/).
4. Create a
   [new database user](https://www.mongodb.com/docs/atlas/security-add-mongodb-users/)
   with read and write access to the cluster.
5. To send alerts to a specific Discord channel, create a
   [Discord webhook](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks)
   for that channel.
6. Add the environment variables found in the `.env.example` file to all
   environments (i.e. Production, Preview, Development) in the Vercel project
   with the `vercel env add` command or through the
   [Vercel dashboard](https://vercel.com/docs/projects/environment-variables).
7. Deploy the bot with `vercel`.
8. Setup a [Vercel cron job](https://vercel.com/docs/solutions/cron-jobs) to run
   the bot every 10 minutes.

   ```json
   {
     "crons": [
       {
         "path": "/api/update",
         "schedule": "*/10 * * * *"
       }
     ]
   }
   ```

9. Disable
   [Vercel's Deployment Protection](https://vercel.com/docs/security/deployment-protection)
   if you want to be able to call the `/api/update` endpoint remotely.
