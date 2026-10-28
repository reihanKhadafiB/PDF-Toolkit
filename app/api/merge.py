from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from starlette.concurrency import run_in_threadpool
from typing import List
import uuid
from app.core.validators import validate_pdf_file, validate_pdf_encryption
from app.core.file_manager import save_upload_file, cleanup_files
from app.core.request_validation import ordered_uploads
from app.services.merge_service import merge_pdfs
router = APIRouter()
@router.post("/merge")
async def merge_pdf_endpoint(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    file_order: str = Form(...)
):
    temp_files = []
    try:
        ordered_files = ordered_uploads(files, file_order)
        if len(ordered_files) < 2:
            raise HTTPException(status_code=400, detail="Minimal dua PDF diperlukan untuk digabungkan.")
        file_paths = []
        for f in ordered_files:
            await validate_pdf_file(f)
            unique_filename = f"{uuid.uuid4().hex}_{f.filename}"
            saved_path = await save_upload_file(f, unique_filename)
            temp_files.append(saved_path)
            await run_in_threadpool(validate_pdf_encryption, saved_path)
            file_paths.append(saved_path)
        merged_file_path = await run_in_threadpool(merge_pdfs, file_paths)
        temp_files.append(merged_file_path)
        background_tasks.add_task(cleanup_files, temp_files)
        return FileResponse(
            path=merged_file_path,
            filename="merged.pdf",
            media_type="application/pdf"
        )
    except Exception as e:
        if temp_files:
            cleanup_files(temp_files)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Gagal menggabungkan PDF. Pastikan semua file PDF valid.")
