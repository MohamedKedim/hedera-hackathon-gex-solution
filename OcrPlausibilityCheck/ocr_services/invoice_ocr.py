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


class InvoiceOCRService:
    """
    Service for extracting structured data from Invoice documents.
    """
    
    def __init__(self):
        """Initialize the Invoice OCR service"""
        # LLM Configuration
        self.use_llm_refinement = os.getenv('USE_LLM_REFINEMENT', 'true').lower() == 'true'
        self.llm_api_url = os.getenv('LLM_API_URL', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent')
        self.llm_api_key = os.getenv('LLM_API_KEY')
        self.llm_model = os.getenv('LLM_MODEL', 'gemini-2.0-flash')
    
    async def process_document(self, content: bytes, filename: str) -> Dict[str, Any]:
        """Process the Invoice document and extract structured information."""
        text = self._extract_text_from_pdf(content)
        
        structured_text = None
        if not text or len(text.strip()) < 100:
            text, bounding_boxes = self._ocr_pdf_with_bounding_boxes(content)
            if bounding_boxes:
                structured_text = self._structure_text_by_spatial_layout(bounding_boxes)
        
        processing_text = structured_text if structured_text else text
        
        extracted_data = {
            "identifiers": self._extract_identifiers(processing_text),
            "parties": self._extract_parties(processing_text),
            "billing_period": self._extract_billing_period(processing_text),
            "product_amount": self._extract_product_amount(processing_text),
            "logistics": self._extract_logistics(processing_text),
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
    
    def _extract_identifiers(self, text: str) -> Dict[str, Any]:
        """Extract invoice identifiers"""
        identifiers = {
            "invoice_no": None,
            "issue_date": None,
            "payment_due": None
        }
        
        # Invoice number
        invoice_pattern = r'Invoice No[\s:\.]+([A-Z0-9■\-]+)'
        match = re.search(invoice_pattern, text, re.IGNORECASE)
        if match:
            identifiers["invoice_no"] = match.group(1).replace('■', '-').strip()
        
        # Issue date
        issue_pattern = r'Issue Date[\s:]+(\d{4}[■\-]\d{2}[■\-]\d{2})'
        match = re.search(issue_pattern, text, re.IGNORECASE)
        if match:
            identifiers["issue_date"] = match.group(1).replace('■', '-')
        
        # Payment due
        due_pattern = r'Payment Due[\s:]+(\d{4}[■\-]\d{2}[■\-]\d{2})'
        match = re.search(due_pattern, text, re.IGNORECASE)
        if match:
            identifiers["payment_due"] = match.group(1).replace('■', '-')
        
        return identifiers
    
    def _extract_parties(self, text: str) -> Dict[str, Any]:
        """Extract party information"""
        parties = {
            "supplier": None,
            "buyer": None
        }
        
        supplier_pattern = r'Supplier[\s:]+([^\n]+)'
        match = re.search(supplier_pattern, text, re.IGNORECASE)
        if match:
            parties["supplier"] = match.group(1).strip()
        
        buyer_pattern = r'Buyer[\s:]+([^\n]+)'
        match = re.search(buyer_pattern, text, re.IGNORECASE)
        if match:
            parties["buyer"] = match.group(1).strip()
        
        return parties
    
    def _extract_billing_period(self, text: str) -> Dict[str, Any]:
        """Extract billing period"""
        billing = {
            "period_start": None,
            "period_end": None
        }
        
        # Billing period with arrow
        period_pattern = r'(\d{4}[■\-]\d{2}[■\-]\d{2})\s*[→>■\-]+\s*(\d{4}[■\-]\d{2}[■\-]\d{2})'
        match = re.search(period_pattern, text, re.IGNORECASE)
        if match:
            billing["period_start"] = match.group(1).replace('■', '-')
            billing["period_end"] = match.group(2).replace('■', '-')
        
        return billing
    
    def _extract_product_amount(self, text: str) -> Dict[str, Any]:
        """Extract product and amount information"""
        product_amount = {
            "product": None,
            "quantity": None,
            "unit": None,
            "unit_price": None,
            "unit_price_currency": None,
            "amount_excl_vat": None,
            "amount_currency": None
        }
        
        # Product
        product_pattern = r'Product[\s:]+([^\n]+)'
        match = re.search(product_pattern, text, re.IGNORECASE)
        if match:
            product_amount["product"] = match.group(1).strip()
        
        # Quantity
        quantity_pattern = r'Quantity[\s:]+([0-9\.]+)\s*(t|tonnes|MT)'
        match = re.search(quantity_pattern, text, re.IGNORECASE)
        if match:
            product_amount["quantity"] = match.group(1).strip()
            product_amount["unit"] = match.group(2).strip()
        
        # Unit price
        unit_price_pattern = r'Unit Price[\s:]+([€$£])([0-9,]+\.\d{2})/t'
        match = re.search(unit_price_pattern, text, re.IGNORECASE)
        if match:
            product_amount["unit_price_currency"] = match.group(1).strip()
            product_amount["unit_price"] = match.group(2).replace(',', '').strip()
        
        # Amount (excl. VAT)
        amount_pattern = r'Amount\s*\(excl\.?\s*VAT\)[\s:]+([€$£])([0-9,]+\.\d{2})'
        match = re.search(amount_pattern, text, re.IGNORECASE)
        if match:
            product_amount["amount_currency"] = match.group(1).strip()
            product_amount["amount_excl_vat"] = match.group(2).replace(',', '').strip()
        
        return product_amount
    
    def _extract_logistics(self, text: str) -> Dict[str, Any]:
        """Extract logistics information"""
        logistics = {
            "incoterm": None,
            "customs": None
        }
        
        # Incoterm
        incoterm_pattern = r'Incoterm[\s:]+([^\n]+)'
        match = re.search(incoterm_pattern, text, re.IGNORECASE)
        if match:
            logistics["incoterm"] = match.group(1).strip()
        
        # Customs
        customs_pattern = r'Customs[\s:]+([^\n]+)'
        match = re.search(customs_pattern, text, re.IGNORECASE)
        if match:
            logistics["customs"] = match.group(1).strip()
        
        return logistics
    
    async def _refine_with_llm(self, initial_extraction: Dict[str, Any], raw_text: str) -> Dict[str, Any]:
        """Refine extraction using LLM"""
        initial_data = {k: v for k, v in initial_extraction.items() if k not in ['raw_text', 'structured_text']}
        
        prompt = f"""You are an expert at extracting structured data from Invoice documents.

Extract data from this Invoice document:

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
1. Extract identifiers (invoice number, issue date, payment due date)
2. Extract parties (supplier, buyer)
3. Extract billing period (start date, end date)
4. Extract product & amount (product name, quantity, unit price, total amount)
5. Extract logistics (incoterm, customs)
6. Handle merged fields and table structures
7. Clean special characters especially this one ■ 
8. Parse monetary values correctly (remove commas, keep decimals)
9. If a field is missing, keep it as null

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