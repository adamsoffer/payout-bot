import { expect } from "chai";
import dotenv from "dotenv";
import { CARD_COLORS, getMessageDataForEvent } from "../api/helpers/event";

dotenv.config();

const ENS_NAME = "cadams.eth";
const DUMMY_TRANSCODING_TICKET_EVENT = {
  timestamp: 1651264131,
  faceValue: "0.07597039584",
  faceValueUSD: "212.6010755246367967983797350406091",
  recipient: {
    id: "0xa678c0342cc2AD21B084923b995a63cD5D439B5b",
  },
  sender: {
    id: "0xc3c7c4c8f7061b7d6a72766eee5359fe4f36e61e",
  },
  transaction: {
    id: "0x9aedf32d275f77f879857d0629af7cd10bf93dee407e2044ac6da2c9b51dfa7d",
  },
};
const DUMMY_AI_BROADCASTER_EVENT = {
  timestamp: 1651264131,
  faceValue: "0.07597039584",
  faceValueUSD: "212.6010755246367967983797350406091",
  recipient: {
    id: "0xa678c0342cc2AD21B084923b995a63cD5D439B5b",
  },
  sender: {
    id: "0x012345dE92B630C065dFc0caBE4eB34f74f7FC85",
  },
  transaction: {
    id: "0x9aedf32d275f77f879857d0629af7cd10bf93dee407e2044ac6da2c9b51dfa7d",
  },
};

it("pulls from ENS for transcoding tickets", async function () {
  this.timeout(10000);

  const messageData = await getMessageDataForEvent(
    DUMMY_TRANSCODING_TICKET_EVENT
  );

  expect(messageData.name).to.equal(ENS_NAME);
  expect(messageData.twitterStatus).to.equal(
    `Livepeer orchestrator ${ENS_NAME} just earned 0.0760 ETH ($212.60) transcoding approximately 21,135 minutes of video. https://arbiscan.io/tx/0x9aedf32d275f77f879857d0629af7cd10bf93dee407e2044ac6da2c9b51dfa7d`
  );
  expect(messageData.image).to.equal(
    "https://gateway.ipfs.io/ipfs/QmV1wrG2srGPFTrkNZtQH8z3CKcDKS1eMFroqcYkBaFX3Q"
  );
  expect(messageData.cardColor).to.equal(CARD_COLORS.transcoding);

  expect(messageData.discordDescription).to.equal(
    `[**${ENS_NAME}**](https://explorer.livepeer.org/accounts/0xa678c0342cc2AD21B084923b995a63cD5D439B5b/campaign) just earned **0.0760 ETH ($212.60)** transcoding approximately 21,135 minutes of video.`
  );
});

it("pulls from ENS for AI tickets", async function () {
  this.timeout(10000);

  const messageData = await getMessageDataForEvent(DUMMY_AI_BROADCASTER_EVENT);

  expect(messageData.name).to.equal(ENS_NAME);
  expect(messageData.twitterStatus).to.equal(
    `Livepeer orchestrator ${ENS_NAME} just earned 0.0760 ETH ($212.60) performing AI inference on the AI subnet. https://arbiscan.io/tx/0x9aedf32d275f77f879857d0629af7cd10bf93dee407e2044ac6da2c9b51dfa7d`
  );
  expect(messageData.image).to.equal(
    "https://gateway.ipfs.io/ipfs/QmV1wrG2srGPFTrkNZtQH8z3CKcDKS1eMFroqcYkBaFX3Q"
  );
  expect(messageData.cardColor).to.equal(CARD_COLORS.ai);

  expect(messageData.discordDescription).to.equal(
    `[**${ENS_NAME}**](https://explorer.livepeer.org/accounts/0xa678c0342cc2AD21B084923b995a63cD5D439B5b/campaign) just earned **0.0760 ETH ($212.60)** performing AI inference on the [**AI subnet**](https://docs.livepeer.ai/ai/introduction).`
  );
});
