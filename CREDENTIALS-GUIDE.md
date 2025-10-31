# Credentials Setup Guide - Quick Reference

This guide provides a quick reference for all credentials needed to run the GreenEarthX platform locally.

---

## Overview

The platform consists of 5 main components, each requiring different credentials:

1. **certification.webapp** (Port 3002) - Main certification dApp
2. **geomap.webapp** (Port 3001) - Global plant map
3. **onboarding** (Port 3000) - User registration
4. **OcrPlausibilityCheck** (Port 8000) - OCR service
5. **Hedera-collection-and-topics** - Hedera infrastructure setup

---

## Quick Setup Commands

For each folder, run:
```bash
cd <folder_name>
cp .env.example .env
# Edit .env with your credentials (see sections below)
```

---

## 1. Certification WebApp Credentials

**File:** `certification.webapp/.env`

### Auth0 (User Authentication)
```env
AUTH0_SECRET=<openssl rand -hex 32>
AUTH0_BASE_URL=http://localhost:3002
AUTH0_ISSUER_BASE_URL=https://YOUR-TENANT.auth0.com
AUTH0_CLIENT_ID=<from Auth0 dashboard>
AUTH0_CLIENT_SECRET=<from Auth0 dashboard>
AUTH0_AUDIENCE=https://greenearthx/api
```
**Get it:** https://auth0.com/ → Create Application → Regular Web App

### Google Gemini API (AI Processing)
```env
GEMINI_API_KEY=<your_api_key>
```
**Get it:** https://makersuite.google.com/app/apikey

### OpenAI API (Recommendations)
```env
OPENAI_API_KEY=<your_api_key>
```
**Get it:** https://platform.openai.com/api-keys

### PostgreSQL Database
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydb
DB_USERNAME=postgres
DB_PASSWORD=<your_password>
```
**Setup:** Local PostgreSQL or cloud (AWS RDS, Aiven, etc.)

### Hedera Testnet (NFT Minting)
```env
OPERATOR_ACCOUNT_ID=0.0.XXXXXXX
OPERATOR_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
HEDERA_NETWORK=testnet

NFT_INVOICE_COLLECTION=0.0.7108304
NFT_PPA_COLLECTION=0.0.7108301
NFT_POS_COLLECTION=0.0.7108305
NFT_TERMSHEET_COLLECTION=0.0.7131752

HCS_TOPIC_ID=0.0.7108913
```
**Get it:** https://portal.hedera.com/register → Create Testnet Account

**Option:** Use provided credentials above (already deployed) or create your own

### Pinata (IPFS Storage)
```env
PINATA_API_KEY=<your_api_key>
PINATA_API_SECRET=<your_api_secret>
```
**Get it:** https://app.pinata.cloud/ → API Keys

---

## 2. Geomap WebApp Credentials

**File:** `geomap.webapp/.env`

### PostgreSQL Database
```env
DATABASE_URL=postgres://username:password@host:port/database
```

### JWT Secret
```env
GEOMAP_JWT_SECRET=<openssl rand -base64 32>
```

### Google reCAPTCHA v2
```env
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<site_key>
RECAPTCHA_SECRET_KEY=<secret_key>
```
**Get it:** https://www.google.com/recaptcha/admin → Register Site → reCAPTCHA v2

### Email SMTP (Gmail)
```env
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=<16_char_app_password>
```
**Get it:** Gmail → Enable 2FA → https://myaccount.google.com/apppasswords

---

## 3. Onboarding App Credentials

**File:** `onboarding/.env`

### PostgreSQL Database
```env
DATABASE_URL=postgres://username:password@host:port/database
```

### JWT Secret
```env
JWT_SECRET=<openssl rand -base64 32>
```

### Google reCAPTCHA v2
```env
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<site_key>
RECAPTCHA_SECRET_KEY=<secret_key>
```
**Get it:** https://www.google.com/recaptcha/admin

### Email SMTP (Gmail)
```env
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=<app_password>
```

---

## 4. OCR Service Credentials

**File:** `OcrPlausibilityCheck/.env`

### Google Gemini API
```env
LLM_API_KEY=<your_gemini_api_key>
```
**Get it:** https://makersuite.google.com/app/apikey

**Note:** PlausibilityCheck service requires no credentials (algorithm-based)

---

## 5. Hedera Collections Setup

**File:** `Hedera-collection-and-topics/.env`

### Hedera Testnet
```env
OPERATOR_ACCOUNT_ID=0.0.XXXXXXX
OPERATOR_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
```
**Get it:** https://portal.hedera.com/register

---

## Credentials Priority Matrix

| Component | Critical | Important | Optional |
|-----------|----------|-----------|----------|
| **certification.webapp** | Hedera, Pinata | Auth0, DB, Gemini | OpenAI |
| **geomap.webapp** | DB, JWT | reCAPTCHA, Email | — |
| **onboarding** | DB, JWT | reCAPTCHA, Email | — |
| **OcrPlausibilityCheck** | Gemini API | — | — |
| **Hedera-collection-and-topics** | Hedera Account | — | — |

---

## Testing Without Full Setup

If you want to quickly test without configuring all credentials:

### Use Deployed Instances
- **Certification App:** http://gexcertification.ddnsking.com:3000/
  - Email: `hedera@test.gmail`
  - Password: `Hedera2025*`
- **Geomap App:** https://geomap.greenearthx.io/
  - Create your own account

### Use Pre-Configured Hedera
If you only want to test certification features, use these in `certification.webapp/.env`:
```env
OPERATOR_ACCOUNT_ID=0.0.7081162
OPERATOR_PRIVATE_KEY=0xc4318b3530da3134e999fa8a69eec2ff66ecf08d09c1c11ee0ca3a509a7c1056

NFT_INVOICE_COLLECTION=0.0.7108304
NFT_PPA_COLLECTION=0.0.7108301
NFT_POS_COLLECTION=0.0.7108305
NFT_TERMSHEET_COLLECTION=0.0.7131752
HCS_TOPIC_ID=0.0.7108913
```

---

## Credential Security Best Practices

1. **Never commit `.env` files to git** (already in .gitignore)
2. **Use different credentials for production**
3. **Rotate API keys regularly**
4. **Use environment-specific credentials**
5. **Store production secrets in secure vaults** (AWS Secrets Manager, etc.)

---

## Troubleshooting

### Auth0 Issues
- Verify callback URLs match exactly
- Check application type is "Regular Web Application"
- Ensure Auth0 tenant is active

### Hedera Issues
- Verify account has testnet HBAR balance
- Ensure private key is ECDSA format (starts with 0x)
- Check account ID format: 0.0.XXXXXXX

### Database Issues
- Test connection: `psql $DATABASE_URL`
- Ensure database exists
- Run migrations: `npx prisma migrate dev`

### Email Issues
- Use App Password, not regular password (Gmail)
- Enable 2FA first
- Check spam folder for test emails

### API Key Issues
- Verify API keys are active
- Check API quotas/limits
- Test with minimal example

---

## Getting Help

For detailed setup instructions, see:
- [certification.webapp/SETUP.md](certification.webapp/SETUP.md)
- [geomap.webapp/SETUP.md](geomap.webapp/SETUP.md)
- [onboarding/SETUP.md](onboarding/SETUP.md)
- [OcrPlausibilityCheck/SETUP.md](OcrPlausibilityCheck/SETUP.md)
- [Hedera-collection-and-topics/SETUP.md](Hedera-collection-and-topics/SETUP.md)

Contact: marwen123.c@gmail.com
