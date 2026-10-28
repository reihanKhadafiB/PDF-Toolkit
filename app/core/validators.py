from fastapi import UploadFile, HTTPException
from pypdf import PdfReader
from pypdf.errors import PdfReadError
from PIL import Image, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool
from app.config import MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB, MAX_IMAGE_PIXELS

async def validate_upload_size(file: UploadFile) -> None:
    size = 0
    while chunk := await file.read(1024 * 1024):
        size += len(chunk)
        if size > MAX_FILE_SIZE_BYTES:
            await file.seek(0)
            raise HTTPException(status_code=413, detail=f"Ukuran file melebihi batas {MAX_FILE_SIZE_MB}MB.")
    await file.seek(0)

async def validate_pdf_file(file: UploadFile) -> None:
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail=f"File {file.filename} bukan merupakan file PDF.")
    await validate_upload_size(file)
    if not file.size:
        raise HTTPException(status_code=400, detail=f"File {file.filename} kosong.")
    header = await file.read(5)
    await file.seek(0)
    if header != b"%PDF-":
        raise HTTPException(status_code=400, detail="Isi file bukan PDF yang valid.")

async def validate_image_file(file: UploadFile) -> None:
    valid_extensions = ('.png', '.jpg', '.jpeg')
    if not file.filename or not file.filename.lower().endswith(valid_extensions):
        raise HTTPException(status_code=400, detail=f"File {file.filename} bukan merupakan gambar (PNG/JPG).")
    await validate_upload_size(file)
    if not file.size:
        raise HTTPException(status_code=400, detail=f"File {file.filename} kosong.")
    await run_in_threadpool(_validate_image_content, file)


def _validate_image_content(file: UploadFile) -> None:
    try:
        with Image.open(file.file) as image:
            if image.format not in {"PNG", "JPEG"}:
                raise HTTPException(status_code=400, detail="Format gambar tidak didukung.")
            if image.width * image.height > MAX_IMAGE_PIXELS:
                raise HTTPException(status_code=413, detail="Dimensi gambar terlalu besar.")
            image.verify()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise HTTPException(status_code=400, detail="File gambar rusak atau tidak valid.")
    finally:
        file.file.seek(0)
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
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="PDF rusak atau tidak dapat divalidasi.")
