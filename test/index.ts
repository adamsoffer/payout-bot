import { expect } from "chai";
import { getMessageDataForEvent } from "../api/helpers/event";
import dotenv from 'dotenv';

dotenv.config();

const ENS_NAME = "cadams.eth";

it("pulls from ENS", async function () {
  this.timeout(10000);

  const dummyEvent = {
    timestamp: 1651264131,
    faceValue: "0.07597039584",
    faceValueUSD: "212.6010755246367967983797350406091",
    recipient: {
      id: "0xa678c0342cc2AD21B084923b995a63cD5D439B5b",
    },
    transaction: {
      id: "0x9aedf32d275f77f879857d0629af7cd10bf93dee407e2044ac6da2c9b51dfa7d",
    },
  };

  const messageData = await getMessageDataForEvent(dummyEvent);

  expect(messageData.name).to.equal(ENS_NAME);
  expect(messageData.twitterStatus).to.equal(
    `Livepeer orchestrator ${ENS_NAME} just earned 0.0760 ETH ($212.60) transcoding approximately 21,135 minutes of video. https://arbiscan.io/tx/0x9aedf32d275f77f879857d0629af7cd10bf93dee407e2044ac6da2c9b51dfa7d `
  );
  expect(messageData.minutes).to.equal(21134.67428345565);
  expect(messageData.image).to.equal(
    "https://gateway.ipfs.io/ipfs/QmV1wrG2srGPFTrkNZtQH8z3CKcDKS1eMFroqcYkBaFX3Q"
  );

  expect(messageData.discordDescription).to.equal(
    `[**${ENS_NAME}**](https://explorer.livepeer.org/accounts/0xa678c0342cc2AD21B084923b995a63cD5D439B5b/campaign) just earned **0.0760 ETH ($212.60)** transcoding approximately 21,135 minutes of video.`
  );
});
