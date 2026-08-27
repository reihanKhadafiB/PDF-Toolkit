from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
import uuid

from app.core.validators import validate_pdf_file, validate_pdf_encryption
from app.core.file_manager import save_upload_file, cleanup_files
from app.services.compress_service import compress_pdf

router = APIRouter()

@router.post("/compress")
async def compress_pdf_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    temp_files = []

    try:
        await validate_pdf_file(file)

        unique_filename = f"{uuid.uuid4().hex}_{file.filename}"
        saved_path = await save_upload_file(file, unique_filename)
        temp_files.append(saved_path)

        validate_pdf_encryption(saved_path)

        compressed_file_path = compress_pdf(saved_path)
        temp_files.append(compressed_file_path)

        background_tasks.add_task(cleanup_files, temp_files)

        output_name = file.filename
        if not output_name.lower().startswith('compressed_'):
            output_name = f"compressed_{output_name}"

        return FileResponse(
            path=compressed_file_path,
            filename=output_name,
            media_type="application/pdf"
        )

    except Exception as e:
        if temp_files:
            cleanup_files(temp_files)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
