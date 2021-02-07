import { NowRequest, NowResponse } from "@vercel/node";
import { request, gql } from "graphql-request";

const fetch = require("@vercel/fetch")();

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

export default async (_req: NowRequest, res: NowResponse) => {
  const authorization = _req.headers.authorization;
  console.log(authorization);
  if (authorization !== `Bearer ${process.env.API_TOKEN}`) {
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
    await fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      body: JSON.stringify({
        username: "Payout Bot",
        avatar_url:
          "https://user-images.githubusercontent.com/555740/107154952-a6f91880-6943-11eb-84e3-75a9dd06dfaa.png",
        content: `Orchestrator **${
          winningTicketRedeemedEvents[0].recipient.id
        }** just redeemed **${parseFloat(
          winningTicketRedeemedEvents[0].faceValue
        ).toFixed(4)} ETH ($${parseFloat(
          winningTicketRedeemedEvents[0].faceValueUSD
        ).toFixed(2)})**.`,
      }),
      headers: { "Content-Type": "application/json" },
    });

    // update last payout time
    await db
      .collection("payouts")
      .replaceOne({}, { timestamp: winningTicketRedeemedEvents[0].timestamp });
  }

  res.status(200).send(true);
};
