/**
 * Contains the types for the API.
 */

// The recipient of a winning ticket.
export type Recipient = {
  // The ID of the recipient.
  id: string;
};

// The sender of a winning ticket.
export type Sender = {
  // The ID of the sender.
  id: string;
};

// The transaction associated with a winning ticket.
export type Transaction = {
  // The ID of the transaction.
  id: string;
};

// A winning ticket redeemed event.
export type WinningTicketRedeemedEvent = {
  // The timestamp of the event.
  timestamp: number;
  // The face value of the ticket event.
  faceValue: string;
  // The face value in USD of the ticket event.
  faceValueUSD: string;
  // The recipient of the event.
  recipient: Recipient;
  // The sender of the event.
  sender: Sender;
  // The transaction associated with the event.
  transaction: Transaction;
};

// The message data for an event.
export type MessageData = {
  // The Twitter status to use for the event.
  twitterStatus: string;
  // The name of the orchestrator.
  name: string;
  // The image to use for the Discord message.
  image: string;
  // The description to use for the Discord message.
  discordDescription: string;
  // The color of the card in Discord color format.
  cardColor: number;
};
