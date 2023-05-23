import { VercelRequest, VercelResponse } from "@vercel/node";
import { request, gql } from "graphql-request";
import Twitter from "twitter";
import { ethers } from "ethers";

const fetch = require("@vercel/fetch")();

const pricePerPixel = 0.0000000000000012; // (1200 wei)

// the # of pixels in a minute of 240p30fps, 360p30fps, 480p30fps, 720p30fps transcoded renditions.
// (width * height * framerate * seconds in a minute)
const pixelsPerMinute = 2995488000;

export const getTotalFeeDerivedMinutes = ({
  faceValue,
  faceValueUSD,
  pricePerPixel,
  pixelsPerMinute,
}): number => {
  let ethDaiRate = faceValue / faceValueUSD;
  let usdAveragePricePerPixel = pricePerPixel / ethDaiRate;
  let feeDerivedMinutes =
    faceValueUSD / usdAveragePricePerPixel / pixelsPerMinute || 0;
  return feeDerivedMinutes;
};

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
  const client = await MongoClient.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const db = client.db("payoutBot");

  // Cache the database connection and return the connection
  cachedDb = db;
  return db;
}

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.headers.authorization !== `Bearer ${process.env.API_TOKEN}`) {
    res.status(403);
    res.json({
      errors: ["Unauthorized"],
    });
  }
  const uri = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@cluster0.eutpy.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`;
  const db = await connectToDatabase(uri);

  const query = gql`
    {
      winningTicketRedeemedEvents(
        first: 20
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
    "https://api.thegraph.com/subgraphs/name/livepeer/arbitrum-one",
    query
  );

  const { timestamp } = await db.collection("payouts").findOne();

  // Update last event time
  if (winningTicketRedeemedEvents[0].timestamp > timestamp) {
    await db
      .collection("payouts")
      .replaceOne({}, { timestamp: winningTicketRedeemedEvents[0].timestamp });
  }

  // Build a queue of new winning tickets
  let ticketQueue = [];
  for (const thisTicket of winningTicketRedeemedEvents) {
    if (thisTicket.timestamp > timestamp) {
      ticketQueue.push(thisTicket);
    } else {
      break;
    }
  }

  // Notify once for each new winning ticket
  for (const newTicket of ticketQueue) {
    const { twitterStatus, discordDescription, image } =
      await getMessageDataForEvent(newTicket);

    // TODO: get access to twitter API
    // await client.post("statuses/update", {
    //   status: twitterStatus,
    // });

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
            description: discordDescription,
            timestamp: new Date(newTicket.timestamp * 1000).toISOString(),
            url: `https://arbiscan.io/tx/${newTicket.transaction.id}`,
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
  }

  res.status(200).send("Success");
};

export type Recipient = {
  id: string;
};

export type Transaction = {
  id: string;
};

export type WinningTicketRedeemedEvent = {
  timestamp: number;
  faceValue: string;
  faceValueUSD: string;
  recipient: Recipient;
  transaction: Transaction;
};

export const getMessageDataForEvent = async (
  event: WinningTicketRedeemedEvent
): Promise<{
  twitterStatus: string;
  minutes: number;
  name: string;
  image: string;
  discordDescription: string;
}> => {
  let name = event.recipient.id.replace(event.recipient.id.slice(8, 36), "…");
  let image = null;

  try {
    const l1Provider = new ethers.providers.JsonRpcProvider(
      `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`
    );

    const ensName = await l1Provider.lookupAddress(event.recipient.id);

    if (ensName) {
      name = ensName;
    }

    const ensAvatar = await l1Provider.getAvatar(event.recipient.id);

    if (ensAvatar) {
      image = ensAvatar;
    }
  } catch (e) {
    // catch all to allow messages to always be sent
    console.error(e);
  }

  const minutes = await getTotalFeeDerivedMinutes({
    faceValue: event.faceValue,
    faceValueUSD: event.faceValueUSD,
    pricePerPixel,
    pixelsPerMinute,
  });

  const twitterStatus = `Livepeer orchestrator ${name} just earned ${parseFloat(
    event.faceValue
  ).toFixed(4)} ETH ($${parseFloat(event.faceValueUSD).toFixed(
    2
  )}) transcoding approximately ${Math.round(
    minutes
  ).toLocaleString()} minutes of video. https://arbiscan.io/tx/${
    event.transaction.id
  } `;

  const discordDescription = `[**${name}**](https://explorer.livepeer.org/accounts/${
    event.recipient.id
  }/campaign) just earned **${parseFloat(event.faceValue).toFixed(
    4
  )} ETH ($${parseFloat(event.faceValueUSD).toFixed(
    2
  )})** transcoding approximately ${Math.round(
    minutes
  ).toLocaleString()} minutes of video.`;

  return { twitterStatus, minutes, image, name, discordDescription };
};
