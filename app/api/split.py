from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
import uuid
import json
from app.core.validators import validate_pdf_file, validate_pdf_encryption
from app.core.file_manager import save_upload_file, cleanup_files
from app.services.split_service import split_pdf
router = APIRouter()
@router.post("/split")
async def split_pdf_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    selected_pages: str = Form(...)
):
    await validate_pdf_file(file)
    try:
        pages_list = json.loads(selected_pages)
        if not isinstance(pages_list, list) or not all(type(x) is int for x in pages_list):
            raise ValueError()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid selected_pages format. Must be a JSON array of integers.")
    if not pages_list:
        raise HTTPException(status_code=400, detail="No pages selected.")
    unique_filename = f"{uuid.uuid4().hex}_{file.filename}"
    input_path = await save_upload_file(file, unique_filename)
    temp_files = [input_path]
    try:
        validate_pdf_encryption(input_path)
        output_path = split_pdf(input_path, pages_list)
        temp_files.append(output_path)
        background_tasks.add_task(cleanup_files, temp_files)
        original_name = file.filename.rsplit('.', 1)[0]
        return FileResponse(
            path=output_path,
            filename=f"{original_name}_split.pdf",
            media_type='application/pdf'
        )
    except ValueError as ve:
        cleanup_files(temp_files)
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        cleanup_files(temp_files)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Gagal memisahkan PDF. Pastikan file PDF valid.")
