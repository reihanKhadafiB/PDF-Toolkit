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
    selected_pages: str = Form(...)  # Will be a JSON string like "[0, 1, 4]"
):
    await validate_pdf_file(file)
    
    try:
        pages_list = json.loads(selected_pages)
        if not isinstance(pages_list, list) or not all(isinstance(x, int) for x in pages_list):
            raise ValueError()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid selected_pages format. Must be a JSON array of integers.")

    if not pages_list:
        raise HTTPException(status_code=400, detail="No pages selected.")

    unique_filename = f"{uuid.uuid4().hex}_{file.filename}"
    input_path = await save_upload_file(file, unique_filename)
    
    if validate_pdf_encryption(input_path):
        cleanup_files([input_path])
        raise HTTPException(status_code=400, detail=f"File {file.filename} is encrypted/password protected.")
        
    try:
        output_path = split_pdf(input_path, pages_list)
        
        # Schedule cleanup after sending response
        background_tasks.add_task(cleanup_files, [input_path, output_path])
        
        # Original filename without extension
        original_name = file.filename.rsplit('.', 1)[0]
        
        return FileResponse(
            path=output_path,
            filename=f"{original_name}_split.pdf",
            media_type='application/pdf'
        )
    except ValueError as ve:
        cleanup_files([input_path])
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        cleanup_files([input_path])
        raise HTTPException(status_code=500, detail="An error occurred while splitting the PDF.")
