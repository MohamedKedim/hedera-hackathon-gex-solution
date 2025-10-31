# Plausibility Check Service

Fast Python microservice that validates document consistency across PoS, PPA, Term Sheet, and Invoice documents.

## What It Does

- Validates data consistency across multiple documents
- Checks date ranges, party names, and quantities
- Generates compliance scores (0-100)
- Creates verification seal hashes
- Returns detailed pass/fail reports

## Quick Start

### Using Docker (Recommended)

```bash
# Pull and run
docker pull medbnk/plausibilityalgorithm:latest
docker run -d -p 8001:8001 medbnk/plausibilityalgorithm:latest

# For Linux/ARM
sudo docker run -d -p 8001:8001 --platform=linux/arm64 medbnk/plausibilityalgorithm:latest
```

### Build from Source

```bash
cd PlausibilityCheck
pip install -r requirements.txt
python main.py
```

## API Endpoints

**Base URL:** http://localhost:8001

- `POST /check` - Run full plausibility verification
- `GET /health` - Service health check
- `GET /docs` - Interactive API documentation

## Technology

- **Python 3.11** + FastAPI
- **Algorithm-based** (no AI, no external APIs)
- **No environment variables required**
- Response time: <500ms

## Integration

Used by [certification.webapp](../certification.webapp) to validate documents before NFT minting.

## Documentation

- Interactive docs: http://localhost:8001/docs
- Full setup guide: [../OcrPlausibilityCheck/SETUP.md](../OcrPlausibilityCheck/SETUP.md)
