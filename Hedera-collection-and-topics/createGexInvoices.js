const {
  AccountId, PrivateKey, Client, TokenCreateTransaction, TokenType, Hbar
} = require("@hashgraph/sdk");

async function main() {
  let client;
  try {
    const MY_ACCOUNT_ID = AccountId.fromString("0.0.7081162");
    const MY_PRIVATE_KEY = PrivateKey.fromStringECDSA("0xc4318b3530da3134e999fa8a69eec2ff66ecf08d09c1c11ee0ca3a509a7c1056");
    
    client = Client.forTestnet().setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

    console.log("🖼️  CREATING GEX INVOICES COLLECTION...");
    let txCreate = new TokenCreateTransaction()
      .setTokenName("GEX Invoices")
      .setTokenSymbol("GEX-INV")
      .setTokenType(TokenType.NonFungibleUnique)
      .setTreasuryAccountId(MY_ACCOUNT_ID)
      .setSupplyKey(MY_PRIVATE_KEY)
      .setDecimals(0)
      .setMaxTransactionFee(new Hbar(10)); // Increased fee

    txCreate = await txCreate.freezeWith(client);
    txCreate = await txCreate.sign(MY_PRIVATE_KEY);
    const txCreateResponse = await txCreate.execute(client);

    const receiptCreate = await txCreateResponse.getReceipt(client);
    const TOKEN_ID = receiptCreate.tokenId;
    console.log("✅ COLLECTION CREATED:", TOKEN_ID.toString());
    console.log("🔗 View Collection:", `https://hashscan.io/testnet/token/${TOKEN_ID}`);

  } catch (error) {
    console.error("❌ ERROR:", error.message);
  } finally {
    if (client) client.close();
  }
}

main();

// token 0.0.7108304 created