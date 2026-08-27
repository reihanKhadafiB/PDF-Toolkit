import os
import uuid
import fitz
from typing import List
from app.config import TEMP_DIR

def images_to_pdf(image_paths: List[str]) -> str:
    if not image_paths:
        raise ValueError("No images provided")
        
    output_filename = f"scanned_{uuid.uuid4().hex}.pdf"
    output_path = os.path.join(TEMP_DIR, output_filename)
    
    doc = fitz.open()
    
    try:
        for img_path in image_paths:
            if not os.path.exists(img_path):
                raise FileNotFoundError(f"File not found: {img_path}")
                
            img_doc = fitz.open(img_path)
            pdf_bytes = img_doc.convert_to_pdf()
            img_pdf = fitz.open("pdf", pdf_bytes)
            doc.insert_pdf(img_pdf)
            
            img_doc.close()
            img_pdf.close()
            
        doc.save(output_path)
    finally:
        doc.close()
        
    return output_path
