import pymupdf as fitz
import os
import uuid
from typing import List
from app.config import TEMP_DIR
def split_pdf(pdf_path: str, selected_pages: List[int]) -> str:
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"File not found: {pdf_path}")
    output_path = os.path.join(TEMP_DIR, f"split_{uuid.uuid4().hex}.pdf")
    try:
        with fitz.open(pdf_path) as doc, fitz.open() as new_doc:
            for page_num in selected_pages:
                if 0 <= page_num < len(doc):
                    new_doc.insert_pdf(doc, from_page=page_num, to_page=page_num)
            if len(new_doc) == 0:
                raise ValueError("Tidak ada halaman valid yang dipilih.")
            new_doc.save(output_path, garbage=3, deflate=True)
        return output_path
    except Exception:
        if os.path.exists(output_path):
            os.remove(output_path)
        raise
