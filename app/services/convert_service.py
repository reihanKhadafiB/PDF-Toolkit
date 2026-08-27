import os
import uuid
from pdf2docx import Converter
from app.config import TEMP_DIR

def convert_pdf_to_docx(pdf_path: str) -> str:
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"File not found: {pdf_path}")

    output_filename = f"converted_{uuid.uuid4().hex}.docx"
    output_path = os.path.join(TEMP_DIR, output_filename)

    cv = Converter(pdf_path)
    try:
        cv.convert(output_path, start=0, end=None)
    finally:
        cv.close()

    return output_path
