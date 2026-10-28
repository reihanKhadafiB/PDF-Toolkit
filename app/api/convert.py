from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException, Form
from fastapi.responses import FileResponse
from starlette.concurrency import run_in_threadpool
import uuid
from app.core.validators import validate_pdf_file, validate_pdf_encryption
from app.core.file_manager import save_upload_file, cleanup_files
from app.services.convert_service import convert_pdf_to_docx
from app.services.pdf_tools_service import pdf_to_searchable
router = APIRouter()
@router.post("/convert/pdf-to-word")
async def convert_pdf_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    ocr_scanned: bool = Form(False),
    ocr_language: str = Form("eng")
):
    temp_files = []
    try:
        await validate_pdf_file(file)
        unique_filename = f"{uuid.uuid4().hex}_{file.filename}"
        saved_path = await save_upload_file(file, unique_filename)
        temp_files.append(saved_path)
        await run_in_threadpool(validate_pdf_encryption, saved_path)
        conversion_source = saved_path
        if ocr_scanned:
            if ocr_language not in {"eng", "ind"}:
                raise HTTPException(status_code=400, detail="Bahasa OCR tidak didukung.")
            conversion_source = await run_in_threadpool(pdf_to_searchable, saved_path, ocr_language)
            temp_files.append(conversion_source)
        docx_file_path = await run_in_threadpool(convert_pdf_to_docx, conversion_source)
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
        if isinstance(e, RuntimeError):
            raise HTTPException(status_code=501, detail=str(e))
        raise HTTPException(status_code=500, detail="Gagal mengonversi PDF. Pastikan file PDF valid.")
