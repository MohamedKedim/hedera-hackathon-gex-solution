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


class PoSOCRService:
    """
    Service for extracting structured data from Proof of Sustainability (PoS) documents.
    Updated to match PPA/Term Sheet/Invoice OCR structure.
    """
    
    def __init__(self):
        """Initialize the PoS OCR service"""
        # LLM Configuration
        self.use_llm_refinement = os.getenv('USE_LLM_REFINEMENT', 'true').lower() == 'true'
        self.llm_api_url = os.getenv('LLM_API_URL', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent')
        self.llm_api_key = os.getenv('LLM_API_KEY', '')
        self.llm_model = os.getenv('LLM_MODEL', 'gemini-2.0-flash')
    
    async def process_document(self, content: bytes, filename: str) -> Dict[str, Any]:
        """Process the PoS document and extract structured information."""
        text = self._extract_text_from_pdf(content)
        
        structured_text = None
        if not text or len(text.strip()) < 100:
            text, bounding_boxes = self._ocr_pdf_with_bounding_boxes(content)
            if bounding_boxes:
                structured_text = self._structure_text_by_spatial_layout(bounding_boxes)
        
        processing_text = structured_text if structured_text else text
        
        extracted_data = {
            "certificate": self._extract_certificate_info(processing_text),
            "parties": self._extract_parties(processing_text),
            "batch": self._extract_batch_info(processing_text),
            "ghg": self._extract_ghg_info(processing_text),
            "chain_of_custody": self._extract_chain_of_custody(processing_text),
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
    
    def _extract_certificate_info(self, text: str) -> Dict[str, Any]:
        """Extract certificate information"""
        certificate = {
            "pos_id": None,
            "scheme": None,
            "issuer": None,
            "issue_date": None,
            "validity": None
        }
        
        # Extract PoS ID
        pos_id_pattern = r'PoS ID[\s:]+([A-Z0-9■\-]+)'
        match = re.search(pos_id_pattern, text, re.IGNORECASE)
        if match:
            certificate["pos_id"] = match.group(1).replace('■', '-').strip()
        
        # Extract scheme
        scheme_pattern = r'Scheme[\s:]+([^\n]+)'
        match = re.search(scheme_pattern, text, re.IGNORECASE)
        if match:
            certificate["scheme"] = match.group(1).strip()
        
        # Extract issuer
        issuer_pattern = r'Issuer[\s:]+([^\n]+)'
        match = re.search(issuer_pattern, text, re.IGNORECASE)
        if match:
            certificate["issuer"] = match.group(1).strip()
        
        # Extract issue date
        issue_date_pattern = r'Issue Date[\s:]+(\d{4}[■\-]\d{2}[■\-]\d{2})'
        match = re.search(issue_date_pattern, text, re.IGNORECASE)
        if match:
            certificate["issue_date"] = match.group(1).replace('■', '-')
        
        # Extract validity
        validity_pattern = r'Validity\s*[:：]\s*(\d+\s*[Yy]ears?)'
        match = re.search(validity_pattern, text, re.IGNORECASE)
        if match:
            certificate["validity"] = match.group(1).strip()
        
        return certificate
    
    def _extract_parties(self, text: str) -> Dict[str, Any]:
        """Extract party information"""
        parties = {
            "supplier": None,
            "recipient": None
        }
        
        # Extract supplier
        supplier_pattern = r'Supplier[\s:]+([^\n]+)'
        match = re.search(supplier_pattern, text, re.IGNORECASE)
        if match:
            parties["supplier"] = match.group(1).strip()
        
        # Extract recipient
        recipient_pattern = r'Recipient[\s:]+([^\n]+)'
        match = re.search(recipient_pattern, text, re.IGNORECASE)
        if match:
            parties["recipient"] = match.group(1).strip()
        
        return parties
    
    def _extract_batch_info(self, text: str) -> Dict[str, Any]:
        """Extract batch information"""
        batch = {
            "batch_id": None,
            "batch_volume": None,
            "batch_volume_unit": None,
            "energy_content": None,
            "energy_content_unit": None
        }
        
        # Extract Batch ID
        batch_id_pattern = r'Batch ID[\s:]+([A-Z0-9■\-]+)'
        match = re.search(batch_id_pattern, text, re.IGNORECASE)
        if match:
            batch["batch_id"] = match.group(1).replace('■', '-').strip()
        
        # Extract Batch Volume
        volume_pattern = r'Batch Volume[\s:]+([0-9\.]+)\s*(t|tonnes|MT|kg)?'
        match = re.search(volume_pattern, text, re.IGNORECASE)
        if match:
            batch["batch_volume"] = match.group(1).strip()
            if match.group(2):
                batch["batch_volume_unit"] = match.group(2).strip()
        
        # Extract Energy Content
        energy_pattern = r'Energy Content[\s:]+([0-9\.]+)\s*(MWh|kWh|GJ|MJ)?'
        match = re.search(energy_pattern, text, re.IGNORECASE)
        if match:
            batch["energy_content"] = match.group(1).strip()
            if match.group(2):
                batch["energy_content_unit"] = match.group(2).strip()
        
        return batch
    
    def _extract_ghg_info(self, text: str) -> Dict[str, Any]:
        """Extract GHG emissions information"""
        ghg = {
            "ci_lca": None,
            "ci_limit": None,
            "unit": "gCO2e/MJ"
        }
        
        # Extract CI (LCA) value and limit
        # Pattern: CI (LCA): -51.2 gCO2e/MJ (limit ≤ −49.5)
        ci_pattern = r'CI\s*\(LCA\)[\s:]+([−\-]?[0-9\.]+)\s*gCO[■₂2]?[■e]*[/■]*MJ\s*\(limit\s*[≤<=]+\s*([−\-]?[0-9\.]+)\)'
        match = re.search(ci_pattern, text, re.IGNORECASE)
        if match:
            ghg["ci_lca"] = match.group(1).replace('−', '-').strip()
            ghg["ci_limit"] = match.group(2).replace('−', '-').strip()
        else:
            # Try simpler pattern for CI value only
            ci_simple_pattern = r'CI\s*\(LCA\)[\s:]+([−\-]?[0-9\.]+)'
            match = re.search(ci_simple_pattern, text, re.IGNORECASE)
            if match:
                ghg["ci_lca"] = match.group(1).replace('−', '-').strip()
            
            # Try to find limit separately
            limit_pattern = r'limit\s*[≤<=]+\s*([−\-]?[0-9\.]+)'
            match = re.search(limit_pattern, text, re.IGNORECASE)
            if match:
                ghg["ci_limit"] = match.group(1).replace('−', '-').strip()
        
        return ghg
    
    def _extract_chain_of_custody(self, text: str) -> Dict[str, Any]:
        """Extract chain of custody information"""
        chain = {
            "model": None,
            "no_double_counting": False
        }
        
        # Extract model (Mass Balance, Segregated, etc.)
        if 'mass balance' in text.lower():
            chain["model"] = "Mass Balance"
        elif 'segregat' in text.lower():
            chain["model"] = "Segregated"
        
        # Check for no double counting
        if re.search(r'No Double Counting[\s:]*TRUE', text, re.IGNORECASE):
            chain["no_double_counting"] = True
        elif re.search(r'Double Counting[\s:]*(?:No|FALSE)', text, re.IGNORECASE):
            chain["no_double_counting"] = True
        
        return chain
    
    async def _refine_with_llm(self, initial_extraction: Dict[str, Any], raw_text: str) -> Dict[str, Any]:
        """Refine extraction using LLM"""
        initial_data = {k: v for k, v in initial_extraction.items() if k not in ['raw_text', 'structured_text']}
        
        prompt = f"""You are an expert at extracting structured data from Proof of Sustainability (PoS) documents.

Extract data from this PoS document:

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
1. Extract certificate info (PoS ID, scheme, issuer, issue date)
2. Extract parties (supplier, recipient)
3. Extract batch info (batch ID, volume, energy content)
4. Extract GHG info (CI LCA value, CI limit, both should be negative numbers)
5. Extract chain of custody (model like "Mass Balance", no double counting status)
6. Handle merged fields and table structures
7. Clean special characters (■ → -, − → -)
8. Preserve negative signs in CI values (e.g., -51.2, -49.5)
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