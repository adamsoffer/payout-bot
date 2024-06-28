/**
 * @file This file contains the 'Update' API function for the Livepeer Payouts Bot.
 */
import { VercelRequest, VercelResponse } from "@vercel/node";
import { request, gql } from "graphql-request";
import Twitter from "twitter";

import { getMongoDBURI, connectToDatabase } from "./helpers/db";
import { getMessageDataForEvent } from "./helpers/event";

const fetch = require("@vercel/fetch")();

const WINNING_TICKET_QUERY = gql`
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
      sender {
        id
      }
      transaction {
        id
      }
    }
  }
`;

// Create Twitter client.
const client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

/**
 * Setup Livepeer Payouts Bot 'Update' API function.
 */
export default async (req: VercelRequest, res: VercelResponse) => {
  if (
    req.headers.authorization !== `Bearer ${process.env.API_TOKEN}` &&
    req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    res.status(403);
    res.json({
      errors: ["Unauthorized"],
    });
  }

  const uri = getMongoDBURI();
  const db = await connectToDatabase(uri);

  // Retrieve the latest winning ticket redeemed events.
  const { winningTicketRedeemedEvents } = await request(
    `https://gateway-arbitrum.network.thegraph.com/api/${process.env.GRAPH_API_KEY}/subgraphs/id/FE63YgkzcpVocxdCEyEYbvjYqEf2kb1A6daMYRxmejYC`,
    WINNING_TICKET_QUERY
  );

  // Retrieve and update last known event time.
  const document = await db.collection("payouts").findOne();
  const timestamp = document?.timestamp ?? 0;
  if (!document || winningTicketRedeemedEvents[0].timestamp > timestamp) {
    await db
      .collection("payouts")
      .updateOne(
        {},
        { $set: { timestamp: winningTicketRedeemedEvents[0].timestamp } },
        { upsert: true }
      );
  }

  // Build a queue of new winning tickets
  let ticketQueue = [];
  for (const thisTicket of winningTicketRedeemedEvents) {
    if (thisTicket.timestamp > timestamp) {
      ticketQueue.push(thisTicket);
    } else {
      break; // No new tickets found.
    }
  }

  // Notify once for each new winning ticket.
  for (const newTicket of ticketQueue) {
    const { twitterStatus, discordDescription, image, cardColor } =
      await getMessageDataForEvent(newTicket);

    // Post a tweet using the Twitter client.
    if (process.env.TWITTER_CONSUMER_KEY) {
      // TODO: get access to twitter API
      await client.post("statuses/update", {
        status: twitterStatus,
      });
    }

    // Create a Discord message using the Webhook.
    if (process.env.DISCORD_WEBHOOK_URL) {
      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: "POST",
        body: JSON.stringify({
          username: "Payout Alert Bot",
          avatar_url:
            "https://user-images.githubusercontent.com/555740/107160745-213a9480-6966-11eb-927f-a53ae12ab219.png",
          embeds: [
            {
              color: cardColor,
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
  }

  res.status(200).send("Success");
};
