import { VercelRequest, VercelResponse } from "@vercel/node";
import { request, gql } from "graphql-request";
import Box from "3box";
import Twitter from "twitter";

const fetch = require("@vercel/fetch")();

const client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

// Create cached connection variable
let cachedDb = null;

// A function for connecting to MongoDB,
// taking a single parameter of the connection string
async function connectToDatabase(uri) {
  // If the database connection is cached,
  // use it instead of creating a new connection
  if (cachedDb) {
    return cachedDb;
  }

  const MongoClient = require("mongodb").MongoClient;
  const client = await MongoClient.connect(uri, { useNewUrlParser: true });
  const db = client.db("payoutBot");

  // Cache the database connection and return the connection
  cachedDb = db;
  return db;
}

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.headers.authorization !== `Bearer ${process.env.API_TOKEN}`) {
    res.status(403);
    res.json({
      errors: ["Unauthorizaed"],
    });
  }
  const uri = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@cluster0.eutpy.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`;
  const db = await connectToDatabase(uri);

  const query = gql`
    {
      winningTicketRedeemedEvents(
        first: 1
        orderDirection: desc
        orderBy: timestamp
      ) {
        timestamp
        faceValue
        faceValueUSD
        recipient {
          id
        }
        transaction {
          id
        }
      }
    }
  `;

  const { winningTicketRedeemedEvents } = await request(
    "https://api.thegraph.com/subgraphs/name/livepeer/livepeer",
    query
  );

  const { timestamp } = await db.collection("payouts").findOne();

  // if the most recent payout happened after the last
  // one we stored notify discord and save new timestamp
  if (winningTicketRedeemedEvents[0].timestamp > timestamp) {
    let profile = await Box.getProfile(
      winningTicketRedeemedEvents[0].recipient.id
    );
    let space = await Box.getSpace(
      winningTicketRedeemedEvents[0].recipient.id,
      "livepeer"
    );

    let name = winningTicketRedeemedEvents[0].recipient.id.replace(
      winningTicketRedeemedEvents[0].recipient.id.slice(8, 36),
      "…"
    );
    let image = null;

    if (space?.defaultProfile === "3box") {
      name = profile.name;
      image = profile?.image?.length && profile?.image[0].contentUrl["/"];
    }

    if (space?.defaultProfile === "livepeer") {
      name = space.name;
      if (space?.image) {
        image = `https://ipfs.infura.io/ipfs/${space.image}`;
      }
    }

    await client.post("statuses/update", {
      status: `Livepeer orchestrator ${name} just redeemed ${parseFloat(
        winningTicketRedeemedEvents[0].faceValue
      ).toFixed(4)} ETH ($${parseFloat(
        winningTicketRedeemedEvents[0].faceValueUSD
      ).toFixed(2)}). https://etherscan.io/tx/${
        winningTicketRedeemedEvents[0].transaction.id
      }`,
    });

    await fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      body: JSON.stringify({
        username: "Payout Alert Bot",
        avatar_url:
          "https://user-images.githubusercontent.com/555740/107160745-213a9480-6966-11eb-927f-a53ae12ab219.png",
        embeds: [
          {
            color: 60296,
            title: "Orchestrator Payout",
            description: `[**${name}**](https://explorer.livepeer.org/accounts/${
              winningTicketRedeemedEvents[0].recipient.id
            }/campaign) just redeemed **${parseFloat(
              winningTicketRedeemedEvents[0].faceValue
            ).toFixed(4)} ETH ($${parseFloat(
              winningTicketRedeemedEvents[0].faceValueUSD
            ).toFixed(2)})**.`,
            url: `https://etherscan.io/tx/${winningTicketRedeemedEvents[0].transaction.id}`,
            ...(image && {
              thumbnail: {
                url: image,
              },
            }),
          },
        ],
      }),
      headers: { "Content-Type": "application/json" },
    });

    // update last payout time
    await db
      .collection("payouts")
      .replaceOne({}, { timestamp: winningTicketRedeemedEvents[0].timestamp });
  }

  res.status(200).send("Success");
};
