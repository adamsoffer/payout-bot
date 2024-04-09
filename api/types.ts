/**
 * Contains the types for the API.
 */

// The recipient of a winning ticket.
export type Recipient = {
  id: string;
};

// The transaction associated with a winning ticket.
export type Transaction = {
  id: string;
};

// A winning ticket redeemed event.
export type WinningTicketRedeemedEvent = {
  timestamp: number;
  faceValue: string;
  faceValueUSD: string;
  recipient: Recipient;
  transaction: Transaction;
};
