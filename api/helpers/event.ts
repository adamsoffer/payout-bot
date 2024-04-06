/**
 * @file This file contains helper functions for handling Graph events.
 */
import { WinningTicketRedeemedEvent } from "../types";
import { ethers } from "ethers";

const pricePerPixel = 0.0000000000000012; // (1200 wei)

// This represents the number of pixels in a minute of video for various resolutions at 30 frames per second.
// The calculation is (width * height * framerate * 60 seconds), and applies to the following resolutions: 240p, 360p, 480p, 720p.
const pixelsPerMinute = 2995488000;

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

/**
 * Retrieves the message data for the given event.
 *
 * @param event - The event.
 * @returns The Discord message data.
 */
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
  
  // Estimate the number of minutes of video transcoded.
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
