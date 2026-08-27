import fitz
import os
import uuid
from typing import List
from app.config import TEMP_DIR

def split_pdf(pdf_path: str, selected_pages: List[int]) -> str:
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"File not found: {pdf_path}")
        
    doc = fitz.open(pdf_path)
    new_doc = fitz.open()
    
    for page_num in selected_pages:
        if 0 <= page_num < len(doc):
            new_doc.insert_pdf(doc, from_page=page_num, to_page=page_num)
            
    if len(new_doc) == 0:
        doc.close()
        new_doc.close()
        raise ValueError("No valid pages were selected.")
        
    output_filename = f"split_{uuid.uuid4().hex}.pdf"
    output_path = os.path.join(TEMP_DIR, output_filename)
    
    new_doc.save(output_path, garbage=3, deflate=True)
    
    doc.close()
    new_doc.close()
    
    return output_path
