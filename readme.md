# Building a Chain of Trust in the Green Power-to-X market
 
A **plausibility-verification + certification platform** for green-hydrogen / Power-to-X plants in Africa and beyond.  
Built on **Hedera** (HTS + HCS) with **IPFS**, **AI OCR**, **Python micro-services**, and a **global plant geomap**.

## Overview

- **Project Title:** Building a Chain of Trust in the Green Power-to-X market
- **Hackathon Track:** Track 2: DLT of Operations 
- **Team Name:** GreenEarthX  
- **Submission Date:** October 2025

### Solution Summary
**GreenEarthX** is a **full-stack certification dApp** that lets plant operators:

1. **Upload** documents (Proof-of-Sustainability, Invoice, PPA, Term-Sheet)  
2. **Run AI OCR + Plausibility Check** (Python micro-services)  
3. **Mint immutable NFTs** (Hedera HTS) with IPFS-backed proofs  
4. **Log every step on HCS** for an **audit trail**  
5. **View all plants on a global geomap** with **" Profile History "** that pulls live **Mirror-Node** for plausibility check results.  

All verification is **on-chain, cost-effective, and instantly shareable**.

---

## Architecture Diagram
<img width="1994" height="1194" alt="image" src="https://github.com/user-attachments/assets/fa4b5210-9be0-4491-bcd3-b449d299edc8" />

## Project Structure – Multi-Repo Layout

> This is a monorepo grouping all hackathon components into a single GitHub project.
> Each folder is a self-contained module with its own README.md, scripts, and deployment instructions.

| Folder                      | Purpose                                                   | Local URL                | Key Documentation                                  |
|-----------------------------|-----------------------------------------------------------|--------------------------|---------------------------------------------|
| certification.webapp        | Next.js dApp for document upload, OCR trigger, NFT minting | http://localhost:3002    | [SETUP.md](certification.webapp/SETUP.md) \| [README.md](certification.webapp/README.md) |
| geomap.webapp               | Interactive global plant map + live Mirror Node history   | http://localhost:3001    | [SETUP.md](geomap.webapp/SETUP.md) \| [README.md](geomap.webapp/README.md) |
| onboarding                  | User onboarding and registration                          | http://localhost:3000    | [SETUP.md](onboarding/SETUP.md) \| [README.md](onboarding/README.md) |
| OcrPlausibilityCheck        | Python FastAPI OCR service (Docker)                       | http://localhost:8000    | [SETUP.md](OcrPlausibilityCheck/SETUP.md) |
| PlausibilityCheck           | Plausibility algorithm micro-service (Docker)             | http://localhost:8001    | See [OcrPlausibilityCheck/SETUP.md](OcrPlausibilityCheck/SETUP.md) |
| Hedera-collection-and-topics| Scripts to create NFT collections & HCS topic             | —                        | [SETUP.md](Hedera-collection-and-topics/SETUP.md) |
| certification_terraform     | Terraform IaC for backend infra (optional)                | —                        | [README.md](certification_terraform/README.md) |
| geomap-infrastructure       | Cloud infra for Geomap (optional)                         | —                        | [README.md](geomap-infrastructure/README.md) |

---

## Local Setup Guide for Judges

Each folder contains detailed setup instructions. Here's the recommended order:

### Prerequisites
- Node.js v18+
- Docker Desktop
- PostgreSQL (local or cloud)
- Internet connection

### Quick Start (15-20 minutes)

1. **Start Backend Services** (Required first)
   ```bash
   # Pull and run Docker containers
   docker pull medbnk/plausibility_ocrs:latest
   docker pull medbnk/plausibilityalgorithm:latest
   docker run -d -p 8000:8000 medbnk/plausibility_ocrs:latest
   docker run -d -p 8001:8001 medbnk/plausibilityalgorithm:latest
   ```
   See [OcrPlausibilityCheck/SETUP.md](OcrPlausibilityCheck/SETUP.md)

2. **Setup Onboarding App** (Optional)
   ```bash
   cd onboarding
   cp .env.example .env
   # Configure .env (see SETUP.md for credentials)
   npm install && npm run dev
   ```
   See [onboarding/SETUP.md](onboarding/SETUP.md)

3. **Setup Geomap App** (Optional)
   ```bash
   cd geomap.webapp
   cp .env.example .env
   # Configure .env (see SETUP.md for credentials)
   npm install && npm run dev
   ```
   See [geomap.webapp/SETUP.md](geomap.webapp/SETUP.md)

4. **Setup Certification App** (Main application)
   ```bash
   cd certification.webapp
   cp .env.example .env
   # Configure .env (see SETUP.md for all required credentials)
   npm install && npm run dev
   ```
   See [certification.webapp/SETUP.md](certification.webapp/SETUP.md)

5. **(Optional) Create Your Own Hedera Collections**
   ```bash
   cd Hedera-collection-and-topics
   cp .env.example .env
   # Add your Hedera testnet credentials
   node createGexInvoices.js
   node createGexPowerPurchase.js
   node createGexSustainability.js
   node createGexTermsheet.js
   node createGexTraceTopic.js
   ```
   See [Hedera-collection-and-topics/SETUP.md](Hedera-collection-and-topics/SETUP.md)

### Credentials Cheat Sheet

Each `.env.example` file contains detailed instructions. Key services you'll need:

| Service | Purpose | Get It From | Required For |
|---------|---------|-------------|--------------|
| Auth0 | User authentication | https://auth0.com/ | certification.webapp |
| Google Gemini API | AI OCR processing | https://makersuite.google.com/app/apikey | certification.webapp, OcrPlausibilityCheck |
| OpenAI API | AI recommendations | https://platform.openai.com/api-keys | certification.webapp |
| Hedera Testnet | NFT minting & HCS | https://portal.hedera.com/register | certification.webapp |
| Pinata | IPFS file storage | https://app.pinata.cloud/ | certification.webapp |
| PostgreSQL | Database | Local or Aiven/AWS RDS | All webapps |
| Google reCAPTCHA | Form protection | https://www.google.com/recaptcha/admin | geomap.webapp, onboarding |
| Email SMTP | Verification emails | Gmail App Password | geomap.webapp, onboarding |

---

## ⚠️ **Important Tip for Judges:**
We have deployed both applications on the cloud for you to test. The codebase used is exactly the same as the one presented in this repository.
Since 10 minutes is not sufficient for full credentials configuration, we are providing you with the following resources:
- Certification URL: [http://gexcertification.ddnsking.com:3000/](Certification WebApp)
- Test Account: **Email:** `hedera@test.gmail`, **Password:** `Hedera2025*`
- Geomap URL:  [https://geomap.greenearthx.io/](GeoMap) (you can create your own account)

> **Detailed Testing Guides:** Each folder contains a comprehensive SETUP.md with step-by-step instructions, troubleshooting, and testing scenarios.

## Hedera Integration Summary

### Services Used

#### 1. Hedera Token Service (HTS) - NFT Collections
**Why We Chose HTS:**  
We chose HTS to create 4 NFT collections that serve as **immutable records of sustainability proofs, invoices, power purchase agreements, and term sheets**. HTS eliminates the need for smart contract deployment, reducing complexity and costs. Each NFT collection provides a tamper-proof, verifiable record that can be instantly recognized across the Hedera ecosystem.

**4 NFT Collections Created on Hedera Testnet:**

| Collection Name | Token ID | Symbol | Purpose |
|-----------------|----------|--------|--------|
| **GEX Proof of Sustainability** | `0.0.7108305` | `GEX-POS` | Immutable Proof of Sustainability (PoS) for green H2/RFNBO compliance |
| **GEX Invoices** | `0.0.7108304` | `GEX-INV` | Verified sales invoices linked to certified production |
| **GEX Power Purchase Agreement** | `0.0.7108301` | `GEX-PPA` | Tokenized long-term offtake contracts |
| **TermSheet NFT Collection** | `0.0.7131752` | `TERM-NFT` | Legal & financial term sheets for project financing |

> **Each NFT contains:**  
> - `ipfs://<CID>` → PDF document  
> - `ipfs://<OCR_CID>` → AI-extracted structured data  (optional) 
> - Timestamp

**Transaction Types:**  
- `TokenCreateTransaction` - Creating 4 NFT collections with metadata
- `TokenMintTransaction` - Issuing NFTs to the collections with metadata URIs
- `TokenTransferTransaction` - Transferring NFTs to recipients

**Key Function (`certification.webapp/src/lib/hedera.ts`):**
```ts
mintNFT(metadata: { name: string; image: string }, tokenIdString: string)
```

**Economic Justification:**  
HTS's predictable, low fees (~$0.001 per mint) make it economically viable to issue large volumes of NFTs in African markets where transaction costs directly impact adoption. The built-in royalty capabilities and standardized metadata format ensure sustainability without expensive smart contract maintenance. This is critical for our business model targeting **green hydrogen and Power-to-X developers in Africa**.

---

#### 2. Hedera Consensus Service (HCS) - Event Logging
**Why We Chose HCS:**  
We created dedicated HCS topic to log all NFT issuance and plausibility check events immutably. Each event submission creates an auditable trail of when NFTs were created, issued, and verified. This provides transparency and accountability essential for **sustainability certification and regulatory compliance**.

**Transaction Types:**  
- `TopicCreateTransaction` - Setting up HCS topic for event logging
- `TopicMessageSubmitTransaction` - Recording issuance events: who issued an NFT, when, which collection, and associated metadata

**HCS Event Payload (logged on mint):**
```json 
{
  "event": "NFT_MINTED",
  "documentType": "invoice",
  "collection": "0.0.7108304",
  "serial": "1",
  "ipfs": "ipfs://bafy...",
  "timestamp": "2025-10-29T12:00:00Z"
}
```

**Economic Justification:**  
HCS's $0.0001 per message fee ensures we can log comprehensive audit trails without incurring prohibitive costs. This is especially valuable in Africa where operational cost predictability is essential for business sustainability. Every transaction is immutably recorded and timestamped by Hedera's Byzantine Fault Tolerant consensus.

---

#### 3. IPFS Integration - File Storage
**Why We Chose IPFS:**  
We use IPFS to decentralized store actual files (documents, images, certificates) and store only the IPFS content hash (CID) within the NFT metadata. This approach provides several advantages:
- **Scalability:** NFTs remain lightweight; heavy files live off-chain
- **Permanence:** Files pinned to IPFS ensure long-term availability
- **Verifiability:** The immutable hash proves file integrity and authenticity

**Implementation:**  
- Upload files to IPFS using `uploadToPinata(buffer, filename)`
- Receive IPFS CID (content hash)
- Embed `ipfs://<CID>` in NFT metadata URI
- Store reference in Hedera NFT

**Key Function (`certification.webapp/src/lib/ipfs.ts`):**
```ts
uploadToPinata(data: ArrayBuffer | Uint8Array, filename: string): Promise<string>
```

**Economic Justification:**  
By separating file storage from blockchain transactions, we reduce on-chain costs while maintaining cryptographic proof of file authenticity. IPFS ensures files remain accessible without reliance on centralized servers vulnerable to censorship or downtime—critical for African markets with infrastructure challenges.

---

#### 4. Hedera Mirror Node - Transaction History & Verification
**Why We Chose Mirror Node:**  
We query Hedera Mirror Node Explorer to retrieve complete transaction histories, verify NFT creation events, and display immutable audit trails to users. This allows real-time verification without requiring users to run their own nodes.

**Transaction Types:**  
- Mirror Node REST API queries for:
  - Token transaction history (all mints and transfers)
  - HCS topic message retrieval (all issuance events)
  - Account activity and balance verification

**Mirror Node Queries Used:**

- `GET /tokens/{tokenId}/nfts` → All minted NFTs
- `GET /topics/{topicId}/messages` → HCS event log
- `GET /accounts/{id}/tokens` → Operator balance  

**Economic Justification:**  
Mirror Node queries are free and publicly accessible, enabling cost-free verification and transparency. Users in Africa can instantly prove authenticity and ownership without intermediaries, reducing friction and building trust in the ecosystem.

---




## Deployed Hedera Testnet IDs

| Component | ID | Purpose |
|-----------|----|---------| 
| GEX-POS | `0.0.7108305` | Proof of Sustainability |
| GEX-INV | `0.0.7108304` | Invoices |
| GEX-PPA | `0.0.7108301` | Power Purchase Agreements |
| TERM-NFT | `0.0.7131752` | Term Sheets |
| HCS Topic  | `0.0.7108913` | All issuance & plausibility events|
| Testnet Account ID | `0.0.7081162` | Main transaction signer |

> Live Verification Links:
> - [HashScan POS](https://hashscan.io/testnet/token/0.0.7108305)
> - [HashScan HCS Topic](https://hashscan.io/testnet/topic/0.0.7108913)

---

---

## Complete Setup Documentation

For detailed local setup instructions with credentials configuration, testing scenarios, and troubleshooting:

- **Certification WebApp Setup:** [certification.webapp/SETUP.md](certification.webapp/SETUP.md)
- **Geomap WebApp Setup:** [geomap.webapp/SETUP.md](geomap.webapp/SETUP.md)
- **Onboarding App Setup:** [onboarding/SETUP.md](onboarding/SETUP.md)
- **OCR & Plausibility Services Setup:** [OcrPlausibilityCheck/SETUP.md](OcrPlausibilityCheck/SETUP.md)
- **Hedera Collections Setup:** [Hedera-collection-and-topics/SETUP.md](Hedera-collection-and-topics/SETUP.md)

Each guide includes:
- Step-by-step installation
- Credential configuration with links to obtain API keys
- Testing scenarios for judges
- Troubleshooting common issues
- Expected behavior documentation

---


## Expected Running State

| Folder                      | Expected Running State |
|-----------------------------|------------------------|
| certification.webapp        | ✅ Running on port **3002** |
| Geomap.webapp               | ✅ Running on port **3001** |
| Onboarding.app              | ✅ Running on port **3000** |
| OcrPlausibilityCheck        | ✅ Running on port **8000** |
| PlausibilityCheck           | ✅ Running on port **8001** |
| Hedera-collection-and-topics| ⚙️ Used for setup scripts only |
| certification_terraform     | ⚙️ Optional (not required for local run) |
| geomap-infrastructure       | ⚙️ Optional (not required for local run) |



## Additional Resources

- [Hedera Documentation](https://docs.hedera.com/)
- [Hedera SDK (JavaScript)](https://github.com/hashgraph/hedera-sdk-js)
- [HTS Token Service Docs](https://docs.hedera.com/hedera/sdks-and-apis/token-service)
- [HCS Consensus Service Docs](https://docs.hedera.com/hedera/sdks-and-apis/hedera-consensus-service)
- [Hedera Mirror Node API](https://mainnet-public.mirrornode.hedera.com/)
- [IPFS Documentation](https://docs.ipfs.io/)
- [Pinata IPFS Pinning Service](https://www.pinata.cloud/)

---

## Support & Contact

**Team Contact:** [marwen123.c@gmail.com ]  
**GitHub Issues:** [Link to your GitHub repo issues]  

---

*Prepared for Hedera Africa Hackathon 2025*
