"""
Test script for Plausibility Check API
Uses real data from your OCR results
"""

import requests
import json

# Base URL
BASE_URL = "http://localhost:8001"

# Your actual OCR results
test_data = {
  "pos": {
    "certificate": {
      "pos_id": "EU-ISCC-Cert-DE123-2025-0001-A",
      "scheme": "ISCC EU (RFNBO)",
      "issuer": "Control Union Certifications",
      "issue_date": "2025-05-01",
      "validity": None
    },
    "parties": {
      "supplier": "GreenHydro Methanol GmbH",
      "recipient": "Valenz Chemicals GmbH"
    },
    "batch": {
      "batch_id": "BATCH-2025-06-A",
      "batch_volume": "59.7",
      "batch_volume_unit": "t",
      "energy_content": "328.35",
      "energy_content_unit": "MWh"
    },
    "ghg": {
      "ci_lca": "-51.2",
      "ci_limit": "-49.5",
      "unit": "gCO2e/MJ"
    },
    "chain_of_custody": {
      "model": "Mass Balance",
      "no_double_counting": True
    }
  },
  "termsheet": {
    "identifiers": {
      "ts_id": "TS-VALENZ-EMEOH-2025",
      "date": "2025-02-01",
      "expiry": "2025-04-30"
    },
    "parties": {
      "seller": "GreenHydro Methanol GmbH",
      "buyer": "Valenz Chemicals GmbH"
    },
    "commercial": {
      "acq": "3600",
      "acq_unit": "t/yr",
      "delivery": "DAP Steyerberg (Incoterms 2020)",
      "pricing": "Fixed Y1-Y5 (see PPA), indexed post-Y5 (Argus MeOH)"
    },
    "sustainability": {
      "ci_target": "≤ -49.5 gCO2/MJ",
      "scheme": "ISCC EU / REDcert EU"
    },
    "timing": {
      "commencement": "post COD",
      "long_stop": "2028-03-30"
    }
  },
  "ppa": {
    "parties": {
      "seller": {
        "name": "GreenHydro Methanol GmbH",
        "registration": "HRB 913245"
      },
      "buyer": {
        "name": "Valenz Chemicals GmbH",
        "registration": "HRB 118223"
      }
    },
    "key_terms": {
      "project_id": "VALENZ-EMEOH-2025",
      "commodity": "e-Methanol (RFNBO)",
      "effective_date": "2025-05-01",
      "duration": "10 years",
      "acq": "3600",
      "acq_unit": "t/yr",
      "monthly_plan": "300.0",
      "monthly_tolerance": "±5%",
      "delivery": "DAP Steyerberg (Incoterms 2020)",
      "customs": "T2 by Supplier"
    },
    "pricing": {
      "price_y1_y5": "1500",
      "currency": "EUR"
    },
    "sustainability_compliance": {
      "ci_limit": "≤ −49.5 gCO2/MJ",
      "certification": "ISCC EU / REDcert EU (RFNBO scope)",
      "audit_required": True,
      "auditor_signature": "anchored on-chain"
    },
    "commencement": {
      "commencement_rule": "First delivery must be COD − 1 month",
      "long_stop_date": "2028-03-30"
    }
  },
  "invoice": {
    "identifiers": {
      "invoice_no": "INV-000187",
      "issue_date": "2025-07-01",
      "payment_due": "2025-07-31"
    },
    "parties": {
      "supplier": "GreenHydro Methanol GmbH",
      "buyer": "Valenz Chemicals GmbH"
    },
    "billing_period": {
      "period_start": "2025-06-01",
      "period_end": "2025-06-30"
    },
    "product_amount": {
      "product": "e-Methanol (RFNBO)",
      "quantity": "298.5",
      "unit": "t",
      "unit_price": "1500.00",
      "unit_price_currency": "€",
      "amount_excl_vat": "447750.00",
      "amount_currency": "€"
    },
    "logistics": {
      "incoterm": "DAP Steyerberg (Incoterms 2020)",
      "customs": "T2 by Supplier"
    }
  },
  "plant_id": "PLANT-001"
}

def test_health():
    """Test health endpoint"""
    print("=" * 80)
    print("Testing Health Endpoint")
    print("=" * 80)
    
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_plausibility_check():
    """Test plausibility check with real data"""
    print("=" * 80)
    print("Testing Plausibility Check")
    print("=" * 80)
    
    response = requests.post(
        f"{BASE_URL}/api/v1/plausibility/check",
        json=test_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        
        print(f"\n{'=' * 80}")
        print("PLAUSIBILITY CHECK RESULT")
        print("=" * 80)
        
        print(f"\n✅ Valid: {result['is_valid']}")
        print(f"📅 Invoice Expiry: {result['invoice_expiry_date']}")
        
        if result['seal_hash']:
            print(f"🔒 Seal Hash: {result['seal_hash']}")
        
        print(f"\n{'=' * 80}")
        print("INDIVIDUAL CHECKS")
        print("=" * 80)
        
        for check in result['checks']:
            status = "✅" if check['passed'] else "❌"
            print(f"\n{status} {check['check_name']}")
            print(f"   Expected: {check.get('expected', 'N/A')}")
            print(f"   Actual: {check.get('actual', 'N/A')}")
            if check.get('details'):
                print(f"   Details: {check['details']}")
        
        if result.get('proof'):
            print(f"\n{'=' * 80}")
            print("PROOF MESSAGE")
            print("=" * 80)
            print(result['proof'])
        
        if result.get('hcs_data'):
            print(f"\n{'=' * 80}")
            print("HCS DATA (for Hedera Consensus Service)")
            print("=" * 80)
            print(json.dumps(result['hcs_data'], indent=2))
    else:
        print(f"Error: {response.text}")

def test_invalid_data():
    """Test with invalid data (wrong parties)"""
    print("\n" + "=" * 80)
    print("Testing Invalid Data (Wrong Supplier)")
    print("=" * 80)
    
    invalid_data = test_data.copy()
    invalid_data['invoice']['parties']['supplier'] = "Wrong Company GmbH"
    
    response = requests.post(
        f"{BASE_URL}/api/v1/plausibility/check",
        json=invalid_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Valid: {result['is_valid']}")
        print(f"Seal Hash: {result.get('seal_hash', 'None - Invalid')}")
        
        print("\nFailed Checks:")
        for check in result['checks']:
            if not check['passed']:
                print(f"  ❌ {check['check_name']}: {check.get('details', '')}")

if __name__ == "__main__":
    print("\n🚀 Starting Plausibility Check API Tests\n")
    
    try:
        test_health()
        test_plausibility_check()
        test_invalid_data()
        
        print("\n" + "=" * 80)
        print("✅ All tests completed!")
        print("=" * 80)
    except requests.exceptions.ConnectionError:
        print("\n❌ Cannot connect to API. Make sure it's running:")
        print("   python plausibility_check_main.py")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")