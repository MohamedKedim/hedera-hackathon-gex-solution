# Certification WebApp - Local Setup & Testing Guide

## Overview
The Certification WebApp is the core dApp for document upload, AI OCR processing, plausibility checks, and NFT minting on Hedera. This guide will help judges set up and test the application locally.

---

## Prerequisites

Before starting, ensure you have:
- Node.js (v18 or higher)
- npm or yarn package manager
- PostgreSQL database (local or cloud)
- Active internet connection for API calls

---

## Step 1: Install Dependencies

```bash
cd certification.webapp
npm install
```

---

## Step 2: Environment Configuration

### 2.1 Copy the Example Environment File
```bash
cp .env.example .env
```

### 2.2 Configure Required Credentials

Open the `.env` file and configure the following sections:

#### A. Auth0 Configuration (Required for Authentication)
1. Go to [Auth0 Dashboard](https://auth0.com/)
2. Create a new application (Regular Web Application)
3. Configure the following in `.env`:
```env
AUTH0_SECRET=<generate with: openssl rand -hex 32>
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://YOUR-TENANT.auth0.com
AUTH0_CLIENT_ID=<from Auth0 app dashboard>
AUTH0_CLIENT_SECRET=<from Auth0 app dashboard>
AUTH0_AUDIENCE=https://greenearthx/api
NEXT_PUBLIC_AUTH0_REDIRECT_URI=http://localhost:3000/api/auth/callback
NEXT_PUBLIC_AUTH0_POST_LOGOUT_REDIRECT_URI=http://localhost:3000
```

4. In Auth0 Dashboard, configure:
   - Allowed Callback URLs: `http://localhost:3002/api/auth/callback`
   - Allowed Logout URLs: `http://localhost:3002`

#### B. AI API Keys (Required for OCR & Recommendations)
1. **Google Gemini API** (for AI processing):
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create API key
   - Add to `.env`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   ```

#### C. PostgreSQL Databfase Configuration
1. Set up a PostgreSQL database (local or cloud)
2. Configure in `.env`:
```env
DB_HOST=localhost
DB_PORT=5433
DB_NAME=mydb
DB_USERNAME=postgres
DB_PASSWORD=medbnk000
```

#### D. Hedera Configuration (CRITICAL for NFT Minting)

**Option 1: Use Existing Testnet Collections (Recommended for Judges)**
```env
OPERATOR_ACCOUNT_ID=0.0.7081162
OPERATOR_PRIVATE_KEY=0xc4318b3530da3134e999fa8a69eec2ff66ecf08d09c1c11ee0ca3a509a7c1056
MY_PRIVATE_KEY=0xc4318b3530da3134e999fa8a69eec2ff66ecf08d09c1c11ee0ca3a509a7c1056
HEDERA_NETWORK=testnet

NFT_INVOICE_COLLECTION=0.0.7108304
NFT_PPA_COLLECTION=0.0.7108301
NFT_POS_COLLECTION=0.0.7108305
NFT_TERMSHEET_COLLECTION=0.0.7131752

HCS_TOPIC_ID=0.0.7108913
NEXT_PUBLIC_HCS_TOPIC_ID=0.0.7108913
```

#### E. IPFS / Pinata Configuration (Required for File Storage)
1. Go to [Pinata](https://app.pinata.cloud/)
2. Sign up for a free account
3. Generate API keys
4. Add to `.env`:
```env
PINATA_API_KEY=your_pinata_api_key
PINATA_API_SECRET=your_pinata_api_secret
```

---

## Step 3: Start Backend Services

Before running the webapp, ensure these services are running:

### 3.1 OCR Service (Port 8000)
- For macOs
```bash
docker pull medbnk/plausibility_ocrs:latest
docker run -p 8000:8000 medbnk/plausibility_ocrs:latest
```
- For Linux 
```bash
docker pull medbnk/plausibilityalgorithm:latest
sudo docker run -d -p 8000:8000 --platform=linux/arm64 medbnk/plausibility_ocrs
```

### 3.2 Plausibility Check Service (Port 8001)
- For macOs
```bash
docker pull medbnk/plausibilityalgorithm:latest
docker run -p 8001:8001 medbnk/plausibilityalgorithm:latest
```
- For Linux
```bash
docker pull medbnk/plausibilityalgorithm:latest
sudo docker run -d -p 8001:8001 --platform=linux/arm64 medbnk/plausibilityalgorithm
```


### 3.2 Postgres Database (Port 5433)
```bash
docker pull maryemwh/mydb-image:latest
 
docker run -d \
  --name mydb-container \
  -p 5433:5432 \
  --restart unless-stopped \
  -e POSTGRES_DB=mydb \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=medbnk000 \
  maryemwh/mydb-image:latest
```

Verify services are running:
- OCR: http://localhost:8000/docs
- Plausibility: http://localhost:8001/docs

---

## Step 4: Run the Application

```bash
npm run dev
```

The application will start on: http://localhost:3000

---

## Step 5: Testing Guide for Judges

### 5.1 Use the provided account
- ```Email: hedera@test.com```
- ```Password: Hedera2025*```
1. Navigate to http://localhost:3000
2. Click "Sign Up" or "Login"

### 5.2 Access Plant Builder
1. Once logged in, navigate to the Plant Builder page
2. Create a new plant configuration by dragging components

### 5.3 Upload Documents & Mint NFTs

1.  **Select one of the following Tunisian plants** as your test plant:
    * **EcoHydro One**
    * **MethoClear Hydrogen**
    * **JetNova Sousse SAF Plant**

---

## ✅ Step 2: Document Upload, OCR, and NFT Minting

This scenario covers the full data ingestion process, from file upload to initial blockchain transactions (NFT minting).

| Action | Details & Required Files | System Behavior 
| :--- | :--- | :--- | 
| **1. Upload Files** | Click **"Upload"** and select all required files from the **`OcrPlausibilityCheck/test_pdfs`** folder: **PPA, POS, Invoice, and Termsheet.** | Documents are staged for processing. |
| **2. Run OCR** | Click the **"Run OCR"** button. | **Uploads** files to **IPFS via Pinata**. **Extracts data** using the **OCR service**. |
| **3. Mint Invoice NFT** | (Triggered by the documents) | Mints an **Invoice NFT** to collection |
---

## 🔬 Step 3: Run Plausibility Check and Verify History

Once the data is extracted via OCR, the system runs the compliance logic and records the result on the blockchain.

1.  **Run Plausibility Check:** After completing Step 2, click **"Run Plausibility Check"**.
    * The system sends extracted data to the OCR service (port `8000`).
    * The system executes the **plausibility algorithm** (port `8001`).
    * The final results, including the **compliance score**, are displayed in the *Compliance Results* section.
2.  **Verify Event in Plant Profile:**
    * Return to the **geomap** and click on your previously selected plant.
    * View the plant's **"Profile History"**.
    * A new **Plausibility Check event** should be visible.
3.  **Verify on Blockchain:**
    * Click the **"HashScan button"** next to the new Plausibility Check event.
    * Confirm the successful transaction recording on the Hedera Testnet.

---
### 5.4 View Transaction History
1. Check HCS topic messages: https://hashscan.io/testnet/topic/0.0.7108913
2. Each upload/mint will appear as a timestamped message

---

## Expected Behavior

| Action | Expected Result |
|--------|----------------|
| Login | Auth0 authentication flow |
| Upload Document | File uploaded to IPFS, returns CID |
| Mint NFT | Transaction on Hedera Testnet, NFT created |
| Plausibility Check | OCR data extracted, compliance score generated |
| View History | HCS messages visible on Mirror Node |

---

## Troubleshooting

### Issue: Auth0 Login Not Working
- Verify callback URLs in Auth0 dashboard
- Check `AUTH0_BASE_URL` matches your localhost port (3002)
---

## Quick Test (Using Deployed App)

If local setup is too time-consuming, use our deployed instance:
- URL: http://gexcertification.ddnsking.com:3000/
- Test Account:
  - Email: `hedera@test.gmail`
  - Password: `Hedera2025*`

---