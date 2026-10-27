from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
import uuid
from app.core.validators import validate_pdf_file, validate_pdf_encryption
from app.core.file_manager import save_upload_file, cleanup_files
from app.services.convert_service import convert_pdf_to_docx
router = APIRouter()
@router.post("/convert/pdf-to-word")
async def convert_pdf_endpoint(
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
        docx_file_path = convert_pdf_to_docx(saved_path)
        temp_files.append(docx_file_path)
        background_tasks.add_task(cleanup_files, temp_files)
        output_name = file.filename
        if output_name.lower().endswith('.pdf'):
            output_name = output_name[:-4] + '.docx'
        else:
            output_name += '.docx'
        return FileResponse(
            path=docx_file_path,
            filename=output_name,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    except Exception as e:
        if temp_files:
            cleanup_files(temp_files)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Gagal mengonversi PDF. Pastikan file PDF valid.")
