import json
import os
import uuid
from typing import List

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from starlette.concurrency import run_in_threadpool

from app.core.file_manager import cleanup_files, save_upload_file
from app.core.validators import validate_pdf_file, validate_upload_size
from app.services import pdf_tools_service as service

router = APIRouter()


@router.post("/organize")
async def organize_pdf(background_tasks: BackgroundTasks, file: UploadFile = File(...),
                       page_order: str = Form(...), rotations: str = Form("{}")):
    temp_files: List[str] = []
    try:
        await validate_pdf_file(file)
        path = await save_upload_file(file, f"{uuid.uuid4().hex}_{file.filename}")
        temp_files.append(path)
        try:
            order = json.loads(page_order)
            rotation_map = json.loads(rotations)
        except json.JSONDecodeError as error:
            raise HTTPException(status_code=400, detail="Data halaman tidak valid.") from error
        if not isinstance(order, list) or not all(type(value) is int for value in order):
            raise HTTPException(status_code=400, detail="Urutan halaman harus berupa daftar nomor halaman.")
        if not isinstance(rotation_map, dict) or not all(
                str(key).lstrip("-").isdigit() and type(value) is int for key, value in rotation_map.items()):
            raise HTTPException(status_code=400, detail="Data rotasi halaman tidak valid.")
        output = await run_in_threadpool(service.organize_pdf, path, order, rotation_map)
        temp_files.append(output)
        background_tasks.add_task(cleanup_files, temp_files)
        return FileResponse(output, filename="organized.pdf", media_type="application/pdf")
    except Exception as error:
        cleanup_files(temp_files)
        if isinstance(error, HTTPException):
            raise
        if isinstance(error, ValueError):
            raise HTTPException(status_code=400, detail=str(error)) from error
        raise HTTPException(status_code=400, detail="PDF tidak dapat diatur. Periksa file dan coba lagi.") from error


@router.post("/office-to-pdf")
async def word_to_pdf(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    temp_files: List[str] = []
    try:
        name = file.filename or ""
        if os.path.splitext(name)[1].lower() not in {".doc", ".docx"}:
            raise HTTPException(status_code=400, detail="Pilih dokumen Word berformat .doc atau .docx.")
        await validate_upload_size(file)
        if not file.size:
            raise HTTPException(status_code=400, detail="File kosong.")
        path = await save_upload_file(file, f"{uuid.uuid4().hex}_{name}")
        temp_files.append(path)
        output = await run_in_threadpool(service.office_to_pdf, path)
        temp_files.append(output)
        background_tasks.add_task(cleanup_files, temp_files)
        return FileResponse(output, filename=os.path.splitext(name)[0] + ".pdf", media_type="application/pdf")
    except Exception as error:
        cleanup_files(temp_files)
        if isinstance(error, HTTPException):
            raise
        if isinstance(error, RuntimeError):
            raise HTTPException(status_code=501, detail=str(error)) from error
        raise HTTPException(status_code=400, detail="Dokumen Word tidak dapat dikonversi. Periksa file dan coba lagi.") from error
