import os
import fitz
import uuid
import subprocess
from app.config import TEMP_DIR

def compress_pdf(pdf_path: str) -> str:
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"File not found: {pdf_path}")
        
    output_filename = f"compressed_{uuid.uuid4().hex}.pdf"
    output_path = os.path.join(TEMP_DIR, output_filename)
    
    command = [
        "gs",
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        "-dPDFSETTINGS=/ebook",
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        f"-sOutputFile={output_path}",
        pdf_path
    ]
    
    try:
        subprocess.run(command, check=True)
    except Exception:
        doc = fitz.open(pdf_path)
        doc.save(
            output_path, 
            garbage=4, 
            deflate=True, 
            clean=True,
        )
        doc.close()
    
    return output_path
