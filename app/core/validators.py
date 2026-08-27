from fastapi import UploadFile, HTTPException
from pypdf import PdfReader
from pypdf.errors import PdfReadError
from app.config import MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB

async def validate_pdf_file(file: UploadFile) -> None:
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail=f"File {file.filename} bukan merupakan file PDF.")

    content = await file.read()
    file_size = len(content)

    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail=f"Ukuran file {file.filename} melebihi batas {MAX_FILE_SIZE_MB}MB.")

    if file_size == 0:
        raise HTTPException(status_code=400, detail=f"File {file.filename} kosong.")

    await file.seek(0)

def validate_pdf_encryption(file_path: str) -> None:
    try:
        reader = PdfReader(file_path)
        if reader.is_encrypted:
            raise HTTPException(
                status_code=400,
                detail="File PDF dilindungi kata sandi (encrypted). Proses tidak dapat dilanjutkan."
            )
    except PdfReadError:
        raise HTTPException(status_code=400, detail="File PDF rusak atau tidak dapat dibaca.")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail=f"Gagal memvalidasi PDF: {str(e)}")
