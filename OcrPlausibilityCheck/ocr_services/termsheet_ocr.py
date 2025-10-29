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


class TermSheetOCRService:
    """
    Service for extracting structured data from Term Sheet documents.
    """
    
    def __init__(self):
        """Initialize the Term Sheet OCR service"""
        # LLM Configuration
        self.use_llm_refinement = os.getenv('USE_LLM_REFINEMENT', 'true').lower() == 'true'
        self.llm_api_url = os.getenv('LLM_API_URL', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent')
        self.llm_api_key = os.getenv('LLM_API_KEY')
        self.llm_model = os.getenv('LLM_MODEL', 'gemini-2.0-flash')
    
    async def process_document(self, content: bytes, filename: str) -> Dict[str, Any]:
        """Process the Term Sheet document and extract structured information."""
        # Extract text from PDF
        text = self._extract_text_from_pdf(content)
        
        # If text extraction fails, try OCR with bounding boxes
        structured_text = None
        if not text or len(text.strip()) < 100:
            text, bounding_boxes = self._ocr_pdf_with_bounding_boxes(content)
            if bounding_boxes:
                structured_text = self._structure_text_by_spatial_layout(bounding_boxes)
        
        processing_text = structured_text if structured_text else text
        
        # Extract structured data
        extracted_data = {
            "identifiers": self._extract_identifiers(processing_text),
            "parties": self._extract_parties(processing_text),
            "commercial": self._extract_commercial_terms(processing_text),
            "sustainability": self._extract_sustainability(processing_text),
            "timing": self._extract_timing(processing_text),
            "raw_text": text,
            "structured_text": structured_text
        }
        
        # Refine with LLM if enabled
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
        """Extract text directly from PDF if it contains text layer"""
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
        """Perform OCR with bounding box data."""
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
        """Structure text based on spatial layout."""
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
    
    def _extract_identifiers(self, text: str) -> Dict[str, Any]:
        """Extract identifier information"""
        identifiers = {
            "ts_id": None,
            "date": None,
            "expiry": None
        }
        
        # Extract TS ID
        ts_pattern = r'TS[■\-][\w■\-]+'
        match = re.search(ts_pattern, text, re.IGNORECASE)
        if match:
            identifiers["ts_id"] = match.group(0).strip()
        
        # Extract dates
        date_pattern = r'Date[\s:]+(\d{4}[■\-]\d{2}[■\-]\d{2})'
        match = re.search(date_pattern, text, re.IGNORECASE)
        if match:
            identifiers["date"] = match.group(1).replace('■', '-')
        
        expiry_pattern = r'Expiry[\s:]+(\d{4}[■\-]\d{2}[■\-]\d{2})'
        match = re.search(expiry_pattern, text, re.IGNORECASE)
        if match:
            identifiers["expiry"] = match.group(1).replace('■', '-')
        
        return identifiers
    
    def _extract_parties(self, text: str) -> Dict[str, Any]:
        """Extract party information"""
        parties = {
            "seller": None,
            "buyer": None
        }
        
        seller_pattern = r'Seller[\s:]+([^\n;]+)'
        match = re.search(seller_pattern, text, re.IGNORECASE)
        if match:
            parties["seller"] = match.group(1).strip()
        
        buyer_pattern = r'Buyer[\s:]+([^\n;]+)'
        match = re.search(buyer_pattern, text, re.IGNORECASE)
        if match:
            parties["buyer"] = match.group(1).strip()
        
        return parties
    
    def _extract_commercial_terms(self, text: str) -> Dict[str, Any]:
        """Extract commercial terms"""
        commercial = {
            "acq": None,
            "acq_unit": None,
            "delivery": None,
            "pricing": None
        }
        
        # Extract ACQ
        acq_pattern = r'ACQ.*?(\d+[\s,]*\d*)\s*(t/yr|tonnes/year|MT/year)'
        match = re.search(acq_pattern, text, re.IGNORECASE)
        if match:
            commercial["acq"] = match.group(1).replace(' ', '').replace(',', '')
            commercial["acq_unit"] = match.group(2).strip()
        
        # Extract delivery
        delivery_pattern = r'Delivery[\s:]+([^\n]+)'
        match = re.search(delivery_pattern, text, re.IGNORECASE)
        if match:
            commercial["delivery"] = match.group(1).strip()
        
        # Extract pricing
        pricing_pattern = r'Pricing[\s:]+([^\n]+)'
        match = re.search(pricing_pattern, text, re.IGNORECASE)
        if match:
            commercial["pricing"] = match.group(1).strip()
        
        return commercial
    
    def _extract_sustainability(self, text: str) -> Dict[str, Any]:
        """Extract sustainability information"""
        sustainability = {
            "ci_target": None,
            "scheme": None
        }
        
        # Extract CI target
        ci_pattern = r'CI Target[\s:]+([≤<]+\s*[-−]?\s*[\d\.]+\s*gCO[■₂2]?/MJ)'
        match = re.search(ci_pattern, text, re.IGNORECASE)
        if match:
            sustainability["ci_target"] = match.group(1).strip()
        
        # Extract scheme
        scheme_pattern = r'Scheme[\s:]+([^\n]+)'
        match = re.search(scheme_pattern, text, re.IGNORECASE)
        if match:
            sustainability["scheme"] = match.group(1).strip()
        
        return sustainability
    
    def _extract_timing(self, text: str) -> Dict[str, Any]:
        """Extract timing information"""
        timing = {
            "commencement": None,
            "long_stop": None
        }
        
        commencement_pattern = r'Commencement[\s:]+([^\n;]+)'
        match = re.search(commencement_pattern, text, re.IGNORECASE)
        if match:
            timing["commencement"] = match.group(1).strip()
        
        long_stop_pattern = r'Long[■\-\s]*Stop[\s:]+(\d{4}[■\-]\d{2}[■\-]\d{2})'
        match = re.search(long_stop_pattern, text, re.IGNORECASE)
        if match:
            timing["long_stop"] = match.group(1).replace('■', '-')
        
        return timing
    
    async def _refine_with_llm(self, initial_extraction: Dict[str, Any], raw_text: str) -> Dict[str, Any]:
        """Refine extraction using LLM"""
        initial_data = {k: v for k, v in initial_extraction.items() if k not in ['raw_text', 'structured_text']}
        
        prompt = f"""You are an expert at extracting structured data from Term Sheet documents.

Extract data from this Term Sheet document:

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
1. Extract identifiers (TS ID, date, expiry)
2. Extract parties (seller, buyer)
3. Extract commercial terms (ACQ, delivery, pricing)
4. Extract sustainability (CI target, certification scheme)
5. Extract timing (commencement, long-stop date)
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