from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from typing import List
import json
import uuid

from app.core.validators import validate_image_file
from app.core.file_manager import save_upload_file, cleanup_files
from app.services.scan_service import images_to_pdf

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
        try:
            order_list = json.loads(file_order)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid file_order format. Must be JSON array.")

        if not order_list:
            raise HTTPException(status_code=400, detail="No file order provided.")

        if len(files) != len(order_list):
            raise HTTPException(status_code=400, detail="Mismatch between uploaded files and file order.")

        file_map = {f.filename: f for f in files}

        ordered_files = []
        for filename in order_list:
            if filename not in file_map:
                raise HTTPException(status_code=400, detail=f"File {filename} in order list was not uploaded.")
            ordered_files.append(file_map[filename])

        file_paths = []
        for f in ordered_files:
            await validate_image_file(f)
            unique_filename = f"{uuid.uuid4().hex}_{f.filename}"
            saved_path = await save_upload_file(f, unique_filename)
            temp_files.append(saved_path)
            file_paths.append(saved_path)

        scanned_file_path = images_to_pdf(file_paths)
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
        raise HTTPException(status_code=500, detail=str(e))
