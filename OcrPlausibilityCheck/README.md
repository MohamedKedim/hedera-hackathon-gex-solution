# OCR & Plausibility Check Services - Local Setup & Testing Guide

## Overview
This guide covers setup for **two Python microservices**:
1. **OcrPlausibilityCheck** (Port 8000) - AI-powered OCR document processing
2. **PlausibilityCheck** (Port 8001) - Plausibility verification algorithm

Both services run as Docker containers and are consumed by the Certification WebApp.

---

## Prerequisites

- Docker installed and running
- Internet connection (for pulling Docker images)
- Ports 8000 and 8001 available

---

## Quick Start (Recommended for Judges)

### Option 1: Use Pre-Built Docker Images

The fastest way to get started is using our pre-built Docker images:

```bash
# Pull the OCR service image
docker pull medbnk/plausibility_ocrs:latest

# Pull the Plausibility algorithm image
docker pull medbnk/plausibilityalgorithm:latest

# Run OCR service on port 8000
docker run -d -p 8000:8000 --name ocr-service medbnk/plausibility_ocrs:latest

# Run Plausibility service on port 8001
docker run -d -p 8001:8001 --name plausibility-service medbnk/plausibilityalgorithm:latest
```

**For Linux/Ubuntu (ARM architecture):**
```bash
sudo docker run -d -p 8000:8000 --platform=linux/arm64 medbnk/plausibility_ocrs:latest
sudo docker run -d -p 8001:8001 --platform=linux/arm64 medbnk/plausibilityalgorithm:latest
```

### Verify Services are Running

```bash
# Check running containers
docker ps

# Test OCR service
curl http://localhost:8000/health

# Test Plausibility service
curl http://localhost:8001/health
```

**Expected Output:**
```json
{"status": "healthy", "service": "ocr"}
{"status": "healthy", "service": "plausibility"}
```

---

## Option 2: Build from Source

If you want to build the Docker images locally:

### Step 1: Configure Environment Variables

#### For OcrPlausibilityCheck Service

```bash
cd OcrPlausibilityCheck
cp .env.example .env
```

Edit `.env` and add your Gemini API key:
```env
LLM_API_KEY=your_gemini_api_key_here
```

**Get Gemini API Key:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key and paste into `.env`

#### For PlausibilityCheck Service

No environment variables required - the service runs algorithm-based checks.

### Step 2: Build Docker Images

```bash
# Build OCR service
cd OcrPlausibilityCheck
docker build -t ocr-service:local .

# Build Plausibility service
cd ../PlausibilityCheck
docker build -t plausibility-service:local .
```

### Step 3: Run the Containers

```bash
# Run OCR service
docker run -d -p 8000:8000 --env-file OcrPlausibilityCheck/.env --name ocr-service ocr-service:local

# Run Plausibility service
docker run -d -p 8001:8001 --name plausibility-service plausibility-service:local
```

## Integration with Certification WebApp

The Certification WebApp expects these services at:
- OCR: `http://localhost:8000`
- Plausibility: `http://localhost:8001`

If running on different ports, update `.env` in certification.webapp:
```env
NEXT_PUBLIC_OCR_SERVICE_URL=http://localhost:8000
NEXT_PUBLIC_PLAUSIBILITY_SERVICE_URL=http://localhost:8001
```