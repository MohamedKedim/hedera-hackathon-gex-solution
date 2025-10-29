import re
from typing import Dict, Any, Optional, List
import io
from datetime import datetime
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


class PoSOCRServiceTwo:
    """
    Service for extracting structured data from Proof of Sustainability (PoS) documents.
    """
    
    def __init__(self):
        """Initialize the PoS OCR service"""
        self.feedstock_keywords = [
            'used cooking oil', 'uco', 'corn starch', 'animal fat', 
            'wood residues', 'rapeseed', 'soybean', 'palm oil',
            'wheat straw', 'forest residues', 'waste', 'residue'
        ]
        
        self.fuel_types = [
            'hvo', 'hydrotreated vegetable oil', 'fame', 'biodiesel',
            'bioethanol', 'biogas', 'e-methanol', 'rme', 'renewable diesel'
        ]
        
        # LLM Configuration
        self.use_llm_refinement = os.getenv('USE_LLM_REFINEMENT', 'true').lower() == 'true'
        self.llm_api_url = os.getenv('LLM_API_URL', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent')
        self.llm_api_key = os.getenv('LLM_API_KEY')
        self.llm_model = os.getenv('LLM_MODEL', 'gemini-2.0-flash')
    
    async def process_document(self, content: bytes, filename: str) -> Dict[str, Any]:
        """
        Process the PoS PDF document and extract structured information.
        
        Args:
            content: PDF file content as bytes
            filename: Name of the uploaded file
            
        Returns:
            Dictionary containing extracted PoS data
        """
        # Extract text from PDF
        text = self._extract_text_from_pdf(content)
        
        # If text extraction fails, try OCR with bounding boxes
        structured_text = None
        if not text or len(text.strip()) < 100:
            text, bounding_boxes = self._ocr_pdf_with_bounding_boxes(content)
            # Create structured text using spatial layout
            if bounding_boxes:
                structured_text = self._structure_text_by_spatial_layout(bounding_boxes)
        
        # Use structured text if available, otherwise use regular text
        processing_text = structured_text if structured_text else text
        
        # Extract structured data using regex-based extraction
        extracted_data = {
            "document_info": self._extract_document_info(processing_text),
            "supplier_recipient": self._extract_supplier_recipient(processing_text),
            "feedstock": self._extract_feedstock_info(processing_text),
            "fuel_product": self._extract_fuel_product_info(processing_text),
            "ghg_emissions": self._extract_ghg_info(processing_text),
            "compliance": self._extract_compliance_info(processing_text),
            "dates": self._extract_dates(processing_text),
            "certification": self._extract_certification_info(processing_text),
            "raw_text": text,
            "structured_text": structured_text  # Include structured version for debugging
        }
        
        # Refine with LLM if enabled and API key is available
        if self.use_llm_refinement and self.llm_api_key:
            try:
                refined_data = await self._refine_with_llm(extracted_data, processing_text)
                # Keep raw_text in the refined response
                refined_data["raw_text"] = text
                refined_data["structured_text"] = structured_text
                refined_data["llm_refined"] = True
                return refined_data
            except Exception as e:
                print(f"LLM refinement failed: {e}. Returning regex-based extraction.")
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
    
    def _ocr_pdf(self, content: bytes) -> str:
        """Perform OCR on PDF if text extraction fails (legacy method)"""
        try:
            images = convert_from_bytes(content)
            text = ""
            for image in images:
                text += pytesseract.image_to_string(image) + "\n"
            return text
        except Exception as e:
            print(f"Error performing OCR: {e}")
            return ""
    
    def _ocr_pdf_with_bounding_boxes(self, content: bytes) -> tuple[str, List[Dict[str, Any]]]:
        """
        Perform OCR with bounding box data to preserve spatial layout.
        Returns both the text and spatial information about each word.
        """
        try:
            images = convert_from_bytes(content)
            all_text = ""
            all_boxes = []
            
            for page_num, image in enumerate(images):
                # Get bounding box data from Tesseract
                # Output.DICT gives us: text, left, top, width, height, conf for each word
                data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
                
                # Extract words with their spatial coordinates
                n_boxes = len(data['text'])
                for i in range(n_boxes):
                    text = data['text'][i].strip()
                    if text:  # Only include non-empty text
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
                
                all_text += "\n"  # New line for each page
            
            return all_text.strip(), all_boxes
            
        except Exception as e:
            print(f"Error performing bounding box OCR: {e}")
            return "", []
    
    def _structure_text_by_spatial_layout(self, boxes: List[Dict[str, Any]]) -> str:
        """
        Structure the extracted text based on spatial layout.
        Groups words by lines (similar Y coordinates) and orders them left-to-right.
        This helps separate merged fields that are spatially distinct.
        """
        if not boxes:
            return ""
        
        # Group boxes by approximate Y coordinate (same line)
        # Allow 10 pixel tolerance for same line
        lines = []
        current_line = []
        current_y = None
        y_tolerance = 10
        
        # Sort boxes by top position first, then left position
        sorted_boxes = sorted(boxes, key=lambda b: (b['top'], b['left']))
        
        for box in sorted_boxes:
            if current_y is None:
                current_y = box['top']
                current_line = [box]
            elif abs(box['top'] - current_y) <= y_tolerance:
                # Same line
                current_line.append(box)
            else:
                # New line - save current line
                if current_line:
                    lines.append(current_line)
                current_line = [box]
                current_y = box['top']
        
        # Don't forget the last line
        if current_line:
            lines.append(current_line)
        
        # Build structured text with proper spacing
        structured_text = ""
        for line in lines:
            # Sort words in line by left position
            line.sort(key=lambda b: b['left'])
            
            # Add words with spacing based on horizontal distance
            prev_right = None
            for box in line:
                if prev_right is not None:
                    # Calculate gap between words
                    gap = box['left'] - prev_right
                    if gap > 50:  # Large gap - likely different columns
                        structured_text += "  |  "  # Column separator
                    elif gap > 20:  # Medium gap - likely different fields
                        structured_text += "  "
                    else:
                        structured_text += " "
                
                structured_text += box['text']
                prev_right = box['left'] + box['width']
            
            structured_text += "\n"
        
        return structured_text
    
    def _extract_document_info(self, text: str) -> Dict[str, Any]:
        """Extract basic document information"""
        info = {
            "document_type": "Proof of Sustainability (PoS)",
            "unique_number": None,
            "issuance_date": None,
            "directive": None
        }
        
        # Extract unique PoS number
        pos_number_pattern = r'(?:Unique Number|PoS Number|Certificate Number)[\s:]+([A-Z0-9\-]+)'
        match = re.search(pos_number_pattern, text, re.IGNORECASE)
        if match:
            info["unique_number"] = match.group(1).strip()
        
        # Extract issuance date
        date_pattern = r'(?:Date of Issuance|Issue Date)[\s:]+(\d{2}\.\d{2}\.\d{4})'
        match = re.search(date_pattern, text, re.IGNORECASE)
        if match:
            info["issuance_date"] = match.group(1).strip()
        
        # Check for RED II directive
        if 'RED II' in text or '2018/2001' in text:
            info["directive"] = "Renewable Energy Directive (EU) 2018/2001 (RED II)"
        
        return info
    
    def _extract_supplier_recipient(self, text: str) -> Dict[str, Any]:
        """Extract supplier and recipient information"""
        data = {
            "supplier": {
                "name": None,
                "address": None,
                "country": None,
                "certification_system": None,
                "certificate_number": None
            },
            "recipient": {
                "name": None,
                "address": None,
                "country": None,
                "contract_number": None
            },
            "shipping_point": None,
            "receiving_point": None
        }
        
        # Extract supplier name
        supplier_pattern = r'Supplier[\s\S]{0,50}Name[\s:]+([^\n]+)'
        match = re.search(supplier_pattern, text, re.IGNORECASE)
        if match:
            data["supplier"]["name"] = match.group(1).strip()
        
        # Extract recipient name
        recipient_pattern = r'Recipient[\s\S]{0,50}Name[\s:]+([^\n]+)'
        match = re.search(recipient_pattern, text, re.IGNORECASE)
        if match:
            data["recipient"]["name"] = match.group(1).strip()
        
        # Extract certification system
        cert_system_pattern = r'Certification System[\s:]+([^\n]+)'
        match = re.search(cert_system_pattern, text, re.IGNORECASE)
        if match:
            data["supplier"]["certification_system"] = match.group(1).strip()
        
        # Extract certificate number
        cert_num_pattern = r'Certificate Number[\s:]+([A-Z0-9\-]+)'
        match = re.search(cert_num_pattern, text, re.IGNORECASE)
        if match:
            data["supplier"]["certificate_number"] = match.group(1).strip()
        
        # Extract shipping and receiving points
        shipping_pattern = r'(?:Address of dispatch|shipping point)[\s:]+([^\n]+(?:\n[^\n]+)?)'
        match = re.search(shipping_pattern, text, re.IGNORECASE)
        if match:
            data["shipping_point"] = match.group(1).strip()
        
        receiving_pattern = r'(?:Address of receipt|receiving point)[\s:]+([^\n]+(?:\n[^\n]+)?)'
        match = re.search(receiving_pattern, text, re.IGNORECASE)
        if match:
            data["receiving_point"] = match.group(1).strip()
        
        return data
    
    def _extract_feedstock_info(self, text: str) -> Dict[str, Any]:
        """Extract feedstock type and origin information"""
        feedstock = {
            "type": None,
            "country_of_origin": None,
            "is_waste_residue": False,
            "is_low_iluc_risk": False,
            "is_intermediate_crop": False,
            "classification": None,
            "waste_permit_number": None
        }
        
        # Extract feedstock type/raw material
        raw_material_pattern = r'(?:Type of Raw Material|Feedstock)[\s:]+([^\n]+)'
        match = re.search(raw_material_pattern, text, re.IGNORECASE)
        if match:
            feedstock["type"] = match.group(1).strip()
        
        # Check for specific feedstock mentions
        if not feedstock["type"]:
            for keyword in self.feedstock_keywords:
                if keyword.lower() in text.lower():
                    pattern = rf'({keyword}[^\n]*)'
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        feedstock["type"] = match.group(1).strip()
                        break
        
        # Extract country of origin
        origin_pattern = r'Country of Origin[\s:]+([^\n]+)'
        match = re.search(origin_pattern, text, re.IGNORECASE)
        if match:
            feedstock["country_of_origin"] = match.group(1).strip()
        
        # Check if waste/residue
        if re.search(r'waste|residue', text, re.IGNORECASE):
            feedstock["is_waste_residue"] = True
            if 'Yes' in text and 'waste or residue' in text.lower():
                feedstock["is_waste_residue"] = True
        
        # Check for low ILUC risk
        if re.search(r'low ILUC risk', text, re.IGNORECASE):
            feedstock["is_low_iluc_risk"] = True
        
        # Check for intermediate crop
        if re.search(r'intermediate crop', text, re.IGNORECASE):
            feedstock["is_intermediate_crop"] = True
        
        return feedstock
    
    def _extract_fuel_product_info(self, text: str) -> Dict[str, Any]:
        """Extract fuel product and batch details"""
        fuel = {
            "type": None,
            "quantity": None,
            "unit": None,
            "energy_content_mj": None,
            "country_of_production": None,
            "production_start_date": None,
            "dispatch_date": None,
            "eu_red_compliant": False,
            "iscc_compliant": False
        }
        
        # Extract fuel type/product
        product_pattern = r'Type of Product[\s:]+([^\n]+)'
        match = re.search(product_pattern, text, re.IGNORECASE)
        if match:
            fuel["type"] = match.group(1).strip()
        
        # Check for specific fuel types if not found
        if not fuel["type"]:
            for fuel_type in self.fuel_types:
                if fuel_type.lower() in text.lower():
                    fuel["type"] = fuel_type
                    break
        
        # Extract quantity - improved to handle column separators
        quantity_pattern = r'Quantity[\s:|]+([0-9,\.]+)\s*(m3|metric tons|tonnes|liters)?'
        match = re.search(quantity_pattern, text, re.IGNORECASE)
        if match:
            fuel["quantity"] = match.group(1).strip().replace(',', '')
            if match.group(2):
                fuel["unit"] = match.group(2).strip()
        
        # Extract energy content - handle spaces in numbers like "817 971"
        energy_pattern = r'Energy content.*?([0-9,\s\.]+)\s*MJ'
        match = re.search(energy_pattern, text, re.IGNORECASE)
        if match:
            # Remove spaces and commas from number
            energy_value = match.group(1).strip().replace(' ', '').replace(',', '')
            fuel["energy_content_mj"] = energy_value
        
        # Extract country of production
        production_country_pattern = r'Country of.*?production[\s:]+([^\n]+)'
        match = re.search(production_country_pattern, text, re.IGNORECASE)
        if match:
            fuel["country_of_production"] = match.group(1).strip()
        
        # Check RED compliance
        if re.search(r'EU RED Compliant.*?Yes', text, re.IGNORECASE | re.DOTALL):
            fuel["eu_red_compliant"] = True
        
        # Check ISCC compliance
        if re.search(r'ISCC Compliant.*?Yes', text, re.IGNORECASE | re.DOTALL):
            fuel["iscc_compliant"] = True
        
        return fuel
    
    def _extract_ghg_info(self, text: str) -> Dict[str, Any]:
        """Extract GHG emissions and savings information"""
        ghg = {
            "total_emissions_gco2eq_mj": None,
            "emission_saving_percentage": None,
            "default_value_applied": False,
            "breakdown": {
                "eec": None,
                "el": None,
                "ep": None,
                "etd": None,
                "eu": None,
                "esca": None,
                "eccs": None,
                "eccr": None
            },
            "fossil_fuel_comparator": None
        }
        
        # Extract total emissions
        total_emissions_pattern = r'E\s*=.*?([0-9\.]+)\s*gCO2eq/MJ'
        match = re.search(total_emissions_pattern, text, re.IGNORECASE)
        if match:
            ghg["total_emissions_gco2eq_mj"] = float(match.group(1))
        
        # Extract GHG saving percentage
        saving_pattern = r'(?:GHG emission saving|saving)[\s:]+([0-9\.]+)\s*%'
        match = re.search(saving_pattern, text, re.IGNORECASE)
        if match:
            ghg["emission_saving_percentage"] = float(match.group(1))
        
        # Check if default value was applied
        if re.search(r'Total default value.*?Yes', text, re.IGNORECASE | re.DOTALL):
            ghg["default_value_applied"] = True
        
        # Extract breakdown components (Eec, El, Ep, etc.)
        components = ['eec', 'el', 'ep', 'etd', 'eu', 'esca', 'eccs', 'eccr']
        for component in components:
            pattern = rf'{component.upper()}\s*[=:]+\s*([0-9\.]+)'
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                ghg["breakdown"][component] = float(match.group(1))
        
        return ghg
    
    def _extract_compliance_info(self, text: str) -> Dict[str, Any]:
        """Extract compliance and traceability information"""
        compliance = {
            "red_ii_article_29_compliant": False,
            "sustainability_criteria_met": False,
            "chain_of_custody": None,
            "no_double_counting": False,
            "additional_certifications": []
        }
        
        # Check RED II Article 29 compliance
        if re.search(r'Art(?:icle)?\s*29.*?(?:2|complies)', text, re.IGNORECASE):
            compliance["red_ii_article_29_compliant"] = True
            compliance["sustainability_criteria_met"] = True
        
        # Extract chain of custody model
        custody_pattern = r'Chain of custody.*?([^\n]+)'
        match = re.search(custody_pattern, text, re.IGNORECASE)
        if match:
            custody_text = match.group(1).strip()
            if 'mass balance' in custody_text.lower():
                compliance["chain_of_custody"] = "Mass Balance"
            elif 'segregat' in custody_text.lower():
                compliance["chain_of_custody"] = "Segregated"
        
        # Check for double counting disclaimer
        if 'not already been used' in text.lower() or 'quota obligation' in text.lower():
            compliance["no_double_counting"] = True
        
        return compliance
    
    def _extract_dates(self, text: str) -> Dict[str, Any]:
        """Extract all relevant dates from the document"""
        dates = {
            "issuance_date": None,
            "dispatch_date": None,
            "production_start_date": None,
            "bioliquid_use_date": None
        }
        
        # Extract dispatch date
        dispatch_pattern = r'Date of dispatch[\s:]+([0-9]{2}\.[0-9]{2}\.[0-9]{4})'
        match = re.search(dispatch_pattern, text, re.IGNORECASE)
        if match:
            dates["dispatch_date"] = match.group(1).strip()
        
        # Extract production start date
        production_pattern = r'Start date of.*?production[\s:]+([0-9]{2}\.[0-9]{2}\.[0-9]{4})'
        match = re.search(production_pattern, text, re.IGNORECASE)
        if match:
            dates["production_start_date"] = match.group(1).strip()
        
        return dates
    
    def _extract_certification_info(self, text: str) -> Dict[str, Any]:
        """Extract certification and auditing information"""
        cert_info = {
            "certification_scheme": None,
            "certificate_number": None,
            "issuing_body": None,
            "auditor": None
        }
        
        # Extract certification scheme
        scheme_pattern = r'Certification System[\s:]+([^\n]+)'
        match = re.search(scheme_pattern, text, re.IGNORECASE)
        if match:
            cert_info["certification_scheme"] = match.group(1).strip()
        
        # Extract certificate number
        cert_pattern = r'Certificate Number[\s:]+([A-Z0-9\-]+)'
        match = re.search(cert_pattern, text, re.IGNORECASE)
        if match:
            cert_info["certificate_number"] = match.group(1).strip()
        
        return cert_info
    
    async def _refine_with_llm(self, initial_extraction: Dict[str, Any], raw_text: str) -> Dict[str, Any]:
        """
        Refine the extracted data using an LLM API.
        The LLM will read the raw text and the initial extraction to provide more accurate results.
        
        Args:
            initial_extraction: The data extracted using regex patterns
            raw_text: The raw text extracted from the PDF
            
        Returns:
            Refined extraction data
        """
        # Remove raw_text and structured_text from initial extraction for the prompt
        initial_data = {k: v for k, v in initial_extraction.items() if k not in ['raw_text', 'structured_text']}
        
        prompt = f"""You are an expert at extracting structured data from Proof of Sustainability (PoS) documents.

I have extracted data from a PoS PDF document, but the extraction may be inaccurate because:
1. Some fields have values on the same line (attribute: value)
2. Some fields have values on the next line or in table cells below the attribute
3. Table structures make it difficult to match attributes with their values
4. **CRITICAL: OCR sometimes merges adjacent fields together** (e.g., "15.10.2010817971024.058" should be split into date "15.10.2010", energy "817971", and quantity "24.058")

Here is the RAW TEXT extracted from the PDF (with spatial layout preserved where possible):
---
{raw_text}
---

Here is my INITIAL EXTRACTION (which may contain errors or missing data):
---
{json.dumps(initial_data, indent=2)}
---

Please analyze the raw text carefully and provide a CORRECTED and COMPLETE extraction in the EXACT same JSON structure.

IMPORTANT INSTRUCTIONS:
1. Read the raw text thoroughly to find the correct values for each field
2. Look for values both on the same line AND on lines below attribute names
3. Handle table structures where headers are above values
4. **CRITICAL: Look for merged/concatenated values and separate them correctly:**
   - Dates follow DD.MM.YYYY format (e.g., 15.10.2010)
   - Large numbers often represent energy in MJ (e.g., 817971 or "817 971")
   - Small decimal numbers usually represent quantities (e.g., 24.058)
   - Example: "n15.10.2010817 97124.058" should be split into:
     * Date: 15.10.2010
     * Energy: 817971 (or "817 971")
     * Quantity: 24.058
5. If a field's value is clearly stated in the raw text but missing or wrong in the initial extraction, correct it
6. If a field is truly not present in the document, keep it as null
7. Maintain the exact same JSON structure as the initial extraction
8. Extract ALL numerical values accurately (quantities, emissions, percentages, etc.)
9. Pay special attention to:
   - Certificate numbers and unique identifiers
   - Dates (format: DD.MM.YYYY if present)
   - Company names and addresses
   - GHG emissions values and breakdown
   - Feedstock types and origins
   - Compliance declarations (Yes/No fields)
   - Energy content in MJ (may have spaces like "817 971")
   - Quantity values (decimal numbers)
10. Use the "|" separator in the text as a hint for column boundaries (different fields)
11. Clean special characters especially this one ■
Return ONLY the corrected JSON object, no explanations or markdown formatting."""

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "X-goog-api-key": self.llm_api_key,
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "contents": [
                        {
                            "parts": [
                                {
                                    "text": prompt
                                }
                            ]
                        }
                    ],
                    "generationConfig": {
                        "maxOutputTokens": 4096,
                        "temperature": 0.1
                    }
                }
                
                response = await client.post(
                    self.llm_api_url,
                    headers=headers,
                    json=payload
                )
                
                response.raise_for_status()
                result = response.json()
                
                # Extract the JSON from the Gemini response
                llm_text = result['candidates'][0]['content']['parts'][0]['text']
                
                # Try to parse as JSON (remove markdown code blocks if present)
                llm_text = llm_text.strip()
                if llm_text.startswith('```'):
                    # Remove markdown code blocks
                    llm_text = re.sub(r'^```json\s*\n', '', llm_text)
                    llm_text = re.sub(r'^```\s*\n', '', llm_text)
                    llm_text = re.sub(r'\n```\s*$', '', llm_text)
                
                refined_data = json.loads(llm_text)
                
                return refined_data
                
        except Exception as e:
            print(f"Error in LLM refinement: {str(e)}")
            raise