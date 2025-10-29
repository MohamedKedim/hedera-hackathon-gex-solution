from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from typing import Optional
import os

from ocr_services.pos_ocr import PoSOCRService
from ocr_services.invoice_ocr import InvoiceOCRService  # To be implemented
from ocr_services.ppa_ocr import PPAOCRService  # To be implemented
from ocr_services.termsheet_ocr import TermSheetOCRService  # To be implemented

app = FastAPI(
    title="Multi-Document OCR API",
    description="OCR API for processing PPA, Invoices, and Proof of Sustainability documents",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OCR services
pos_ocr_service = PoSOCRService()
invoice_ocr_service = InvoiceOCRService()  # To be implemented
ppa_ocr_service = PPAOCRService()  # To be implemented
termsheet_ocr_service = TermSheetOCRService()  # To be implemented

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Multi-Document OCR API",
        "version": "1.0.0",
        "endpoints": {
            "pos": "/api/v1/ocr/pos",
            "invoice": "/api/v1/ocr/invoice",
            "ppa": "/api/v1/ocr/ppa",
            "termsheet": "/api/v1/ocr/termsheet"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "OCR API"}


@app.post("/api/v1/ocr/pos")
async def process_pos_document(file: UploadFile = File(...)):
    """
    Process a Proof of Sustainability (PoS) document and extract structured information.
    
    Args:
        file: PDF file upload
        
    Returns:
        JSON with extracted PoS data including:
        - Feedstock type and origin
        - Fuel product and batch details
        - GHG emissions and savings
        - Traceability and compliance declarations
    """
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only PDF files are supported."
        )
    
    try:
        # Read file content
        content = await file.read()
        
        # Process the document
        result = await pos_ocr_service.process_document(content, file.filename)
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "filename": file.filename,
                "data": result
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing document: {str(e)}"
        )


@app.post("/api/v1/ocr/invoice")
async def process_invoice_document(file: UploadFile = File(...)):
    """
    Process an Invoice document and extract structured information.
    
    [To be implemented]
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only PDF files are supported."
        )
    
    try:
        # Read file content
        content = await file.read()
        
        # Process the document
        result = await invoice_ocr_service.process_document(content, file.filename)

        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "filename": file.filename,
                "data": result
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing document: {str(e)}"
        )


@app.post("/api/v1/ocr/ppa")
async def process_ppa_document(file: UploadFile = File(...)):
    """
    Process a Power Purchase Agreement (PPA) document and extract structured information.
    
    [To be implemented]
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only PDF files are supported."
        )
    
    try:
        # Read file content
        content = await file.read()
        
        # Process the document
        result = await ppa_ocr_service.process_document(content, file.filename)
        print(result)
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "filename": file.filename,
                "data": result
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing document: {str(e)}"
        )
    
    

@app.post("/api/v1/ocr/termsheet")
async def process_termsheet_document(file: UploadFile = File(...)):
    """
    Process a Term Sheet document and extract structured information.
    
    [To be implemented]
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only PDF files are supported."
        )
    
    try:
        # Read file content
        content = await file.read()
        
        # Process the document
        result = await termsheet_ocr_service.process_document(content, file.filename)

        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "filename": file.filename,
                "data": result
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing document: {str(e)}"
        )


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )