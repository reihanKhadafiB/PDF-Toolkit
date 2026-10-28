import os
from typing import List
from pypdf import PdfWriter
from app.config import TEMP_DIR
import uuid
def merge_pdfs(file_paths: List[str]) -> str:
    merger = PdfWriter()
    try:
        for path in file_paths:
            if not os.path.exists(path):
                raise FileNotFoundError(f"File not found: {path}")
            merger.append(path)
        output_filename = f"merged_{uuid.uuid4().hex}.pdf"
        output_path = os.path.join(TEMP_DIR, output_filename)
        with open(output_path, "wb") as output_file:
            merger.write(output_file)
        return output_path
    finally:
        merger.close()
