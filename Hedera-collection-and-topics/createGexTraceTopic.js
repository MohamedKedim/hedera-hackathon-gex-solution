const {
  AccountId, PrivateKey, Client, TopicCreateTransaction, Hbar
} = require("@hashgraph/sdk");

async function main() {
  let client;
  try {
    const MY_ACCOUNT_ID = AccountId.fromString("0.0.7081162");
    const MY_PRIVATE_KEY = PrivateKey.fromStringECDSA("0xc4318b3530da3134e999fa8a69eec2ff66ecf08d09c1c11ee0ca3a509a7c1056");
    
    client = Client.forTestnet().setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

    console.log("🕰️  CREATING GEX TRACE TOPIC...");
    let txCreate = new TopicCreateTransaction()
      .setTopicMemo("GEX Sustainability Traces") // Optional description
      .setMaxTransactionFee(new Hbar(5)); // Sufficient fee

    txCreate = await txCreate.freezeWith(client);
    txCreate = await txCreate.sign(MY_PRIVATE_KEY);
    const txResponse = await txCreate.execute(client);

    const receipt = await txResponse.getReceipt(client);
    const TOPIC_ID = receipt.topicId;
    console.log("✅ TOPIC CREATED:", TOPIC_ID.toString());
    console.log("🔗 View Topic:", `https://hashscan.io/testnet/topic/${TOPIC_ID}`);

  } catch (error) {
    console.error("❌ ERROR:", error.message);
  } finally {
    if (client) client.close();
  }
}

main();

// topic 0.0.7108913 created