import re
from typing import Dict, Any, Optional, List
import io
import PyPDF2
from pdf2image import convert_from_bytes
import pytesseract
from PIL import Image
import os
import json
import httpx
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class PPAOCRService:
    """
    Service for extracting structured data from Power Purchase Agreement (PPA) documents.
    """
    
    def __init__(self):
        """Initialize the PPA OCR service"""
        # LLM Configuration
        self.use_llm_refinement = os.getenv('USE_LLM_REFINEMENT', 'true').lower() == 'true'
        self.llm_api_url = os.getenv('LLM_API_URL', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent')
        self.llm_api_key = os.getenv('LLM_API_KEY')
        self.llm_model = os.getenv('LLM_MODEL', 'gemini-2.0-flash')
        print("Using API key:", self.llm_api_key)

    async def process_document(self, content: bytes, filename: str) -> Dict[str, Any]:
        """Process the PPA document and extract structured information."""
        text = self._extract_text_from_pdf(content)
        
        structured_text = None
        if not text or len(text.strip()) < 100:
            text, bounding_boxes = self._ocr_pdf_with_bounding_boxes(content)
            if bounding_boxes:
                structured_text = self._structure_text_by_spatial_layout(bounding_boxes)
        
        processing_text = structured_text if structured_text else text
        
        extracted_data = {
            "parties": self._extract_parties(processing_text),
            "key_terms": self._extract_key_terms(processing_text),
            "pricing": self._extract_pricing(processing_text),
            "sustainability_compliance": self._extract_sustainability_compliance(processing_text),
            "commencement": self._extract_commencement(processing_text),
            "raw_text": text,
            "structured_text": structured_text
        }
        
        if self.use_llm_refinement and self.llm_api_key:
            try:
                refined_data = await self._refine_with_llm(extracted_data, processing_text)
                refined_data["raw_text"] = text
                refined_data["structured_text"] = structured_text
                refined_data["llm_refined"] = True
                return refined_data
            except Exception as e:
                print(f"LLM refinement failed: {e}")
                extracted_data["llm_refined"] = False
                return extracted_data
        else:
            extracted_data["llm_refined"] = False
            return extracted_data
    
    def _extract_text_from_pdf(self, content: bytes) -> str:
        """Extract text directly from PDF"""
        try:
            pdf_file = io.BytesIO(content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text
        except Exception as e:
            print(f"Error extracting text from PDF: {e}")
            return ""
    
    def _ocr_pdf_with_bounding_boxes(self, content: bytes) -> tuple[str, List[Dict[str, Any]]]:
        """Perform OCR with bounding box data"""
        try:
            images = convert_from_bytes(content)
            all_text = ""
            all_boxes = []
            
            for page_num, image in enumerate(images):
                data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
                n_boxes = len(data['text'])
                for i in range(n_boxes):
                    text = data['text'][i].strip()
                    if text:
                        box_info = {
                            'text': text,
                            'left': data['left'][i],
                            'top': data['top'][i],
                            'width': data['width'][i],
                            'height': data['height'][i],
                            'confidence': data['conf'][i],
                            'page': page_num
                        }
                        all_boxes.append(box_info)
                        all_text += text + " "
                all_text += "\n"
            return all_text.strip(), all_boxes
        except Exception as e:
            print(f"Error performing bounding box OCR: {e}")
            return "", []
    
    def _structure_text_by_spatial_layout(self, boxes: List[Dict[str, Any]]) -> str:
        """Structure text based on spatial layout"""
        if not boxes:
            return ""
        
        lines = []
        current_line = []
        current_y = None
        y_tolerance = 10
        
        sorted_boxes = sorted(boxes, key=lambda b: (b['top'], b['left']))
        
        for box in sorted_boxes:
            if current_y is None:
                current_y = box['top']
                current_line = [box]
            elif abs(box['top'] - current_y) <= y_tolerance:
                current_line.append(box)
            else:
                if current_line:
                    lines.append(current_line)
                current_line = [box]
                current_y = box['top']
        
        if current_line:
            lines.append(current_line)
        
        structured_text = ""
        for line in lines:
            line.sort(key=lambda b: b['left'])
            prev_right = None
            for box in line:
                if prev_right is not None:
                    gap = box['left'] - prev_right
                    if gap > 50:
                        structured_text += "  |  "
                    elif gap > 20:
                        structured_text += "  "
                    else:
                        structured_text += " "
                structured_text += box['text']
                prev_right = box['left'] + box['width']
            structured_text += "\n"
        
        return structured_text
    
    def _extract_parties(self, text: str) -> Dict[str, Any]:
        """Extract party information"""
        parties = {
            "seller": {
                "name": None,
                "registration": None
            },
            "buyer": {
                "name": None,
                "registration": None
            }
        }
        
        # Extract seller
        seller_pattern = r'Seller[\s:]+([^\n(]+)(?:\s*\(([^)]+)\))?'
        match = re.search(seller_pattern, text, re.IGNORECASE)
        if match:
            parties["seller"]["name"] = match.group(1).strip()
            if match.group(2):
                parties["seller"]["registration"] = match.group(2).strip()
        
        # Extract buyer
        buyer_pattern = r'Buyer[\s:]+([^\n(]+)(?:\s*\(([^)]+)\))?'
        match = re.search(buyer_pattern, text, re.IGNORECASE)
        if match:
            parties["buyer"]["name"] = match.group(1).strip()
            if match.group(2):
                parties["buyer"]["registration"] = match.group(2).strip()
        
        return parties
    
    def _extract_key_terms(self, text: str) -> Dict[str, Any]:
        """Extract key terms"""
        key_terms = {
            "project_id": None,
            "commodity": None,
            "effective_date": None,
            "duration": None,
            "acq": None,
            "acq_unit": None,
            "monthly_plan": None,
            "monthly_tolerance": None,
            "delivery": None,
            "customs": None
        }
        
        # Project ID
        project_pattern = r'Project ID[\s:]+([^\n]+)'
        match = re.search(project_pattern, text, re.IGNORECASE)
        if match:
            key_terms["project_id"] = match.group(1).strip()
        
        # Commodity
        commodity_pattern = r'Commodity[\s:]+([^\n]+)'
        match = re.search(commodity_pattern, text, re.IGNORECASE)
        if match:
            key_terms["commodity"] = match.group(1).strip()
        
        # Effective date
        effective_pattern = r'Effective Date[\s:]+(\d{4}[■\-]\d{2}[■\-]\d{2})'
        match = re.search(effective_pattern, text, re.IGNORECASE)
        if match:
            key_terms["effective_date"] = match.group(1).replace('■', '-')
        
        # Duration
        duration_pattern = r'Duration[\s:]+(\d+)\s*years?'
        match = re.search(duration_pattern, text, re.IGNORECASE)
        if match:
            key_terms["duration"] = match.group(1).strip() + " years"
        
        # ACQ
        acq_pattern = r'ACQ[\s:]+([0-9,]+)\s*(t/yr|tonnes/year)'
        match = re.search(acq_pattern, text, re.IGNORECASE)
        if match:
            key_terms["acq"] = match.group(1).replace(',', '')
            key_terms["acq_unit"] = match.group(2).strip()
        
        # Monthly plan
        monthly_pattern = r'Monthly Plan[\s:]+([0-9\.]+)\s*t\s*\(([^)]+)\)'
        match = re.search(monthly_pattern, text, re.IGNORECASE)
        if match:
            key_terms["monthly_plan"] = match.group(1).strip()
            key_terms["monthly_tolerance"] = match.group(2).strip()
        
        # Delivery
        delivery_pattern = r'Delivery[\s:]+([^\n;]+)'
        match = re.search(delivery_pattern, text, re.IGNORECASE)
        if match:
            key_terms["delivery"] = match.group(1).strip()
        
        # Customs
        customs_pattern = r'Customs[\s:]+([^\n]+)'
        match = re.search(customs_pattern, text, re.IGNORECASE)
        if match:
            key_terms["customs"] = match.group(1).strip()
        
        return key_terms
    
    def _extract_pricing(self, text: str) -> Dict[str, Any]:
        """Extract pricing information"""
        pricing = {
            "price_y1_y5": None,
            "currency": None
        }
        
        # Price
        price_pattern = r'Price\s*\(Y1[■\-–]Y5\)[\s:]+[€$]([0-9,]+)/t'
        match = re.search(price_pattern, text, re.IGNORECASE)
        if match:
            pricing["price_y1_y5"] = match.group(1).replace(',', '')
        
        # Currency
        currency_pattern = r'Currency[\s:]+([A-Z]{3})'
        match = re.search(currency_pattern, text, re.IGNORECASE)
        if match:
            pricing["currency"] = match.group(1).strip()
        
        return pricing
    
    def _extract_sustainability_compliance(self, text: str) -> Dict[str, Any]:
        """Extract sustainability and compliance information"""
        sustainability = {
            "ci_limit": None,
            "certification": None,
            "audit_required": False,
            "auditor_signature": None
        }
        
        # CI limit
        ci_pattern = r'CI Limit[\s:]+([≤<]+\s*[-−]?\s*[\d\.]+\s*gCO[■₂2]?/MJ)'
        match = re.search(ci_pattern, text, re.IGNORECASE)
        if match:
            sustainability["ci_limit"] = match.group(1).strip()
        
        # Certification
        cert_pattern = r'Certification[\s:]+([^\n]+)'
        match = re.search(cert_pattern, text, re.IGNORECASE)
        if match:
            sustainability["certification"] = match.group(1).strip()
        
        # Audit required
        if re.search(r'Third[■\-\s]*party audit required', text, re.IGNORECASE):
            sustainability["audit_required"] = True
        
        # Auditor signature
        if re.search(r'auditor signature.*?on[■\-\s]*chain', text, re.IGNORECASE):
            sustainability["auditor_signature"] = "anchored on-chain"
        
        return sustainability
    
    def _extract_commencement(self, text: str) -> Dict[str, Any]:
        """Extract commencement information"""
        commencement = {
            "commencement_rule": None,
            "long_stop_date": None
        }
        
        # Commencement rule
        rule_pattern = r'Commencement Rule[\s:]+([^\n]+)'
        match = re.search(rule_pattern, text, re.IGNORECASE)
        if match:
            commencement["commencement_rule"] = match.group(1).strip()
        
        # Long-stop date
        long_stop_pattern = r'Long[■\-\s]*Stop Date[\s:]+(\d{4}[■\-]\d{2}[■\-]\d{2})'
        match = re.search(long_stop_pattern, text, re.IGNORECASE)
        if match:
            commencement["long_stop_date"] = match.group(1).replace('■', '-')
        
        return commencement
    
    async def _refine_with_llm(self, initial_extraction: Dict[str, Any], raw_text: str) -> Dict[str, Any]:
        """Refine extraction using LLM"""
        initial_data = {k: v for k, v in initial_extraction.items() if k not in ['raw_text', 'structured_text']}
        
        prompt = f"""You are an expert at extracting structured data from Power Purchase Agreement (PPA) documents.

Extract data from this PPA document:

RAW TEXT:
---
{raw_text}
---

INITIAL EXTRACTION:
---
{json.dumps(initial_data, indent=2)}
---

Provide a CORRECTED extraction in the EXACT same JSON structure.

INSTRUCTIONS:
1. Extract parties (seller, buyer with registration numbers)
2. Extract key terms (project ID, commodity, dates, ACQ, delivery)
3. Extract pricing (price for Y1-Y5, currency)
4. Extract sustainability & compliance (CI limit, certification, audit requirements)
5. Extract commencement (rules, long-stop date)
6. Handle merged fields and table structures
7. Clean special characters especially this one ■ 
8. If a field is missing, keep it as null

Return ONLY the corrected JSON, no explanations."""

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "X-goog-api-key": self.llm_api_key,
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "contents": [{
                        "parts": [{"text": prompt}]
                    }],
                    "generationConfig": {
                        "maxOutputTokens": 4096,
                        "temperature": 0.1
                    }
                }
                
                response = await client.post(self.llm_api_url, headers=headers, json=payload)
                response.raise_for_status()
                result = response.json()
                
                llm_text = result['candidates'][0]['content']['parts'][0]['text'].strip()
                if llm_text.startswith('```'):
                    llm_text = re.sub(r'^```json\s*\n', '', llm_text)
                    llm_text = re.sub(r'^```\s*\n', '', llm_text)
                    llm_text = re.sub(r'\n```\s*$', '', llm_text)
                
                refined_data = json.loads(llm_text)
                return refined_data
        except Exception as e:
            print(f"Error in LLM refinement: {str(e)}")
            raise