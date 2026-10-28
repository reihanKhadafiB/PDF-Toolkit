from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from starlette.concurrency import run_in_threadpool
from typing import List
import uuid
from app.core.validators import validate_image_file
from app.core.file_manager import save_upload_file, cleanup_files
from app.services.scan_service import images_to_pdf
from app.core.request_validation import ordered_uploads
router = APIRouter()
@router.post("/scan-to-pdf")
async def scan_to_pdf_endpoint(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    file_order: str = Form(...)
):
    temp_files = []
    scanned_file_path = None
    try:
        ordered_files = ordered_uploads(files, file_order)
        file_paths = []
        for f in ordered_files:
            await validate_image_file(f)
            unique_filename = f"{uuid.uuid4().hex}_{f.filename}"
            saved_path = await save_upload_file(f, unique_filename)
            temp_files.append(saved_path)
            file_paths.append(saved_path)
        scanned_file_path = await run_in_threadpool(images_to_pdf, file_paths)
        temp_files.append(scanned_file_path)
        background_tasks.add_task(cleanup_files, temp_files)
        return FileResponse(
            path=scanned_file_path,
            filename="scanned_document.pdf",
            media_type="application/pdf"
        )
    except Exception as e:
        if temp_files:
            cleanup_files(temp_files)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Gagal membuat PDF. Pastikan semua gambar valid.")
