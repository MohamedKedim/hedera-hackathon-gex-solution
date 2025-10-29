const {
  AccountId,
  PrivateKey,
  Client,
  TokenCreateTransaction,
  TokenType,
  Hbar,
  CustomRoyaltyFee,
  CustomFixedFee,
  TokenFeeScheduleUpdateTransaction,
  AccountBalanceQuery
} = require("@hashgraph/sdk");

async function createTermSheetNFTCollection() {
  let client;
  try {
    // ==== CONFIGURE YOUR ACCOUNT ====
    const MY_ACCOUNT_ID = AccountId.fromString("0.0.7081162");
    const MY_PRIVATE_KEY = PrivateKey.fromStringECDSA("0xc4318b3530da3134e999fa8a69eec2ff66ecf08d09c1c11ee0ca3a509a7c1056");

    client = Client.forTestnet().setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

    // Optional: Check balance
    const balance = await new AccountBalanceQuery()
      .setAccountId(MY_ACCOUNT_ID)
      .execute(client);
    console.log(`💰 Account Balance: ${balance.hbars.toString()}`);

    console.log("📜 Creating TermSheet NFT Collection...");

    // ==== CREATE NFT COLLECTION ====
    const createTx = new TokenCreateTransaction()
      .setTokenName("TermSheet NFT Collection")
      .setTokenSymbol("TERM-NFT")
      .setTokenType(TokenType.NonFungibleUnique)
      .setDecimals(0)
      .setInitialSupply(0)
      .setTreasuryAccountId(MY_ACCOUNT_ID)
      .setAdminKey(MY_PRIVATE_KEY)        // Can update token
      .setSupplyKey(MY_PRIVATE_KEY)       // Can mint new NFTs
      .setPauseKey(MY_PRIVATE_KEY)        // Can pause transfers
      .setWipeKey(MY_PRIVATE_KEY)         // Can wipe (burn) NFTs
      .setFreezeKey(MY_PRIVATE_KEY)       // Can freeze accounts
      .setMaxTransactionFee(new Hbar(20)) // Safe buffer
      .setTokenMemo("Unique Term Sheets as NFTs | On-chain DeFi Agreements");

    // Freeze and sign
    const frozenTx = await createTx.freezeWith(client);
    const signedTx = await frozenTx.sign(MY_PRIVATE_KEY);
    const txResponse = await signedTx.execute(client);

    const receipt = await txResponse.getReceipt(client);
    const tokenId = receipt.tokenId;

    console.log("✅ TERMSHEET NFT COLLECTION CREATED!");
    console.log(`   Token ID: ${tokenId.toString()}`);
    console.log(`   View: https://hashscan.io/testnet/token/${tokenId}`);
    console.log(`\n🔜 Next: Mint individual Term Sheets using TokenMintTransaction + metadata (IPFS CID)`);

    return tokenId;

  } catch (error) {
    console.error("❌ ERROR CREATING COLLECTION:");
    if (error.transactionId) {
      console.error(`   Transaction ID: ${error.transactionId}`);
      console.error(`   View Failed Tx: https://hashscan.io/testnet/transaction/${error.transactionId}`);
    }
    console.error("   Details:", error.message);
  } finally {
    if (client) client.close();
  }
}

// ==== RUN THE FUNCTION ====
createTermSheetNFTCollection();