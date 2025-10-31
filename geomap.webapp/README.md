# Geomap WebApp - Local Setup & Testing Guide

## Overview
The Geomap WebApp displays all plants on an interactive global map with live transaction history from Hedera Mirror Node. This guide will help judges set up and test the application locally.

---

## Prerequisites

Before starting, ensure you have:
- Node.js (v18 or higher)
- npm or yarn package manager
- PostgreSQL database (local or cloud)
- Active internet connection

---
## Quick Test (Using Deployed App)

If local setup is too time-consuming, use our deployed instance:
- URL: https://geomap.greenearthx.io/
- Create your own account or test existing plants

---

## Step 1: Install Dependencies

```bash
cd geomap.webapp
npm install
```

---

## Step 2: Environment Configuration

### 2.1 Copy the Example Environment File
```bash
cp .env.example .env
```

### 2.2 Configure Required Credentials

Open the `.env` file and configure the following:

#### A. PostgreSQL Database Configuration (Required)
1. Set up a PostgreSQL database 
2. Configure connection string:
```env
DATABASE_URL=postgres://username:password@host:port/database_name
```

**Example for Local PostgreSQL:**
```env
DATABASE_URL=postgres://postgres:password@localhost:5432/geomap_db
```

**Example for Aiven Cloud:**
```env
DATABASE_URL=postgres://avnadmin:YOUR_PASSWORD@host.aivencloud.com:22032/defaultdb
```

3. Run database migrations:
```bash
npx prisma migrate dev
# Or if you have SQL files
psql $DATABASE_URL < insert_pipelines.sql
```

#### B. JWT Secret (Required for Authentication)
Generate a secure random string:
```bash
openssl rand -base64 32
```
Add to `.env`:
```env
GEOMAP_JWT_SECRET=<generated_secret_here>
```

#### C. Application URLs
```env
ONBOARDING_APP_URL=http://localhost:3000
NEXT_PUBLIC_ONBOARDING_URL=http://localhost:3000

GEOMAP_URL=http://localhost:3001
NEXT_PUBLIC_GEOMAP_URL=http://localhost:3001
```

#### D. Google reCAPTCHA v2 (Required for Form Protection)
1. Go to [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Register a new site:
   - Type: reCAPTCHA v2 (Checkbox)
   - Domains: `localhost`
3. Copy the Site Key and Secret Key
4. Add to `.env`:
```env
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_site_key
RECAPTCHA_SECRET_KEY=your_secret_key
```

#### E. Email Configuration (Required for User Verification)

**For Gmail:**
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to: https://myaccount.google.com/apppasswords
   - Create app password for "Mail"
3. Add to `.env`:
```env
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_char_app_password
```

**For Other Email Providers:**
- Ensure SMTP is enabled
- Use appropriate SMTP credentials

---

## Step 3: Database Setup

### 3.1 Initialize Database Schema
```bash
npx prisma db push
```
---

## Step 4: Run the Application

```bash
npm run dev
```

The application will start on: http://localhost:3001

---

## Step 5: Testing Guide for Judges

### 5.1 Create an Account
1. Navigate to http://localhost:3001
2. Click "Sign Up" or "Register"
3. Fill in registration form:
   - Email
   - Password
   - Company details
   - Complete reCAPTCHA
4. Check your email for verification code
5. Enter verification code to activate account

### 5.2 Explore the Global Map

#### Test Scenario 1: View All Plants
1. After login, the interactive map displays all registered plants
2. Each plant is represented by a marker on the map
3. Markers are color-coded by plant type:
   - Green: Production Plants
   - Blue: CCUS Plants
   - Orange: Storage Plants
   - Purple: Port Plants

#### Test Scenario 2: View Plant Details
1. Click on any plant marker
2. View plant information:
   - Plant name
   - Location coordinates
   - Capacity
   - Operator details
   - Certification status

#### Test Scenario 3: View Transaction History (Live Mirror Node Data)
1. Click on a certified plant
2. Navigate to "Profile History" tab
3. View live data pulled from Hedera Mirror Node:
   - NFT minting transactions
   - HCS topic messages
   - Plausibility check results
   - Timestamps

**Example Live Query:**
- Topic Messages: `https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.7108913/messages`
- Token Info: `https://testnet.mirrornode.hedera.com/api/v1/tokens/0.0.7108305`

### 5.3 Filter and Search Plants

#### Filter by Type
1. Use the filter dropdown to show only specific plant types
2. Map updates dynamically

#### Search by Location
1. Use the search bar to find plants by country/region
2. Map zooms to the searched location
---

## Expected Behavior

| Action | Expected Result |
|--------|----------------|
| User Registration | Email sent with verification code |
| Email Verification | Account activated, redirect to map |
| View Map | Interactive map with plant markers |
| Click Plant | Popup with plant details |
| View History | Live Mirror Node data displayed |
| Filter Plants | Map updates with filtered results |

---

## Integration with Other Services

### With Onboarding App (Port 3001)
- User registers via Onboarding App
- After approval, redirected to Geomap

### With Certification App (Port 3000)
- Plants certified via Certification App
- Certifications appear in Geomap history

### With Hedera Mirror Node
- Live transaction data pulled via REST API
- No additional setup required

---

## Database Schema

Key tables:
- `users` - User accounts and authentication
- `plants` - Plant information and locations
- `certifications` - Certification records
- `transactions` - Local cache of Hedera transactions

To view schema:
```bash
npx prisma studio
```
---
