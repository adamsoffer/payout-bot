/**
 * @file This file contains helper functions for handling Graph events.
 */
import { ethers } from "ethers";

import { WinningTicketRedeemedEvent, MessageData } from "../types";

const pricePerPixel = 0.0000000000000012; // (1200 wei)

// This represents the number of pixels in a minute of video for various resolutions at 30 frames per second.
// The calculation is (width * height * framerate * 60 seconds), and applies to the following resolutions: 240p, 360p, 480p, 720p.
const pixelsPerMinute = 2995488000;

// Load AI broadcasters list.
// TODO: This will be removed in the future when we pass the job type in the `auxData` field.
import AIBroadcasters from "../../cfg/AIBroadcasters.json";

export const CARD_COLORS = {
  transcoding: 60296,
  ai: 16766720,
};

/**
 * Calculates the total fee derived minutes based on the given parameters.
 *
 * @param params - An object containing the parameters.
 * @param params.faceValue - The face value.
 * @param params.faceValueUSD - The face value in USD.
 * @param params.pricePerPixel - The price per pixel.
 * @param params.pixelsPerMinute - The number of pixels per minute.
 * @returns The total fee derived minutes.
 */
const getTotalFeeDerivedMinutes = ({
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

/**
 * Check if the ticket sender is an AI broadcaster.
 * @param sender sender id.
 * @returns Boolean indicating if the sender is an AI broadcaster.
 */
const isAIBroadcaster = (sender: string): boolean => {
  return AIBroadcasters.broadcasters.some((b) => b.address === sender);
};

/**
 * Get Discord card color based on the type of ticket (e.g AI or transcoding).
 * 
 * @param event The WinningTicketRedeemedEvent.
 * @returns The card color in Discord color format.
 */
const getCardColor = (event: WinningTicketRedeemedEvent): number => {
  if (isAIBroadcaster(event.sender.id)) {
    return CARD_COLORS.ai;
  }

  return CARD_COLORS.transcoding;
}

/**
 * Create a Twitter status for the given event.
 * 
 * @param name Orchestrator name.
 * @param event The WinningTicketRedeemedEvent.
 * @returns A Twitter status message.
 */
const createTwitterStatus = async (
  name: string,
  event: WinningTicketRedeemedEvent
): Promise<string> => {
  const ethEarned = parseFloat(event.faceValue).toFixed(4);
  const usdEarned = parseFloat(event.faceValueUSD).toFixed(2);
  const transactionUrl = `https://arbiscan.io/tx/${event.transaction.id}`;

  const commonMessage = `Livepeer orchestrator ${name} just earned ${ethEarned} ETH ($${usdEarned})`
  
  // If the orchestrator is an AI broadcaster, return AI broadcaster Discord description.
  // TODO: Replace with check based on job type in the `auxData` field when available.
  if (isAIBroadcaster(event.sender.id)) {
    return `${commonMessage} performing AI inference on the AI subnet. ${transactionUrl}`;
  }

  const minutes = await getTotalFeeDerivedMinutes({
    faceValue: event.faceValue,
    faceValueUSD: event.faceValueUSD,
    pricePerPixel,
    pixelsPerMinute,
  });

  // Return transcoding Discord description.
  const roundedMinutes = Math.round(minutes).toLocaleString();
  return `${commonMessage} transcoding approximately ${roundedMinutes} minutes of video. https://arbiscan.io/tx/${event.transaction.id}`;
};

/**
 * Create a Discord description for the given event.
 *
 * @param name The orchestrator name.
 * @param event The WinningTicketRedeemedEvent.
 * @returns A Discord description message.
 */
const createDiscordDescription = async (
  name: string,
  event: WinningTicketRedeemedEvent
): Promise<string> => {
  const ethEarned = parseFloat(event.faceValue).toFixed(4);
  const usdEarned = parseFloat(event.faceValueUSD).toFixed(2);
  const recipientUrl = `https://explorer.livepeer.org/accounts/${event.recipient.id}/campaign`;

  const commonMessage = `[**${name}**](${recipientUrl}) just earned **${ethEarned} ETH ($${usdEarned})**`;

  // If the orchestrator is an AI broadcaster, return AI broadcaster Discord description.
  // TODO: Replace with check based on job type in the `auxData` field when available.
  if (isAIBroadcaster(event.sender.id)) {
    return `${commonMessage} performing AI inference on the [**AI subnet**](https://explorer.livepeer.org/treasury/82843445347363563575858115586375001878287509193479217286690041153234635982713).`;
  }

  const minutes = await getTotalFeeDerivedMinutes({
    faceValue: event.faceValue,
    faceValueUSD: event.faceValueUSD,
    pricePerPixel,
    pixelsPerMinute,
  });

  // Return transcoding Discord description.
  const roundedMinutes = Math.round(minutes).toLocaleString();
  return `${commonMessage} transcoding approximately ${roundedMinutes} minutes of video.`;
};

/**
 * Retrieves the message data for the given event.
 *
 * @param event - The event.
 * @returns The Discord message data.
 */
export const getMessageDataForEvent = async (
  event: WinningTicketRedeemedEvent
): Promise<MessageData> => {
  let name = event.recipient.id.replace(event.recipient.id.slice(8, 36), "…");
  let image = null;

  // Attempt to fetch ENS name and avatar.
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

  // Create platform-specific messages.
  const twitterStatus = await createTwitterStatus(name, event);
  const discordDescription = await createDiscordDescription(name, event);


  return { twitterStatus, image, name, discordDescription, cardColor: getCardColor(event)};
};
