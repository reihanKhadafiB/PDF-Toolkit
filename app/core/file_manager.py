import os
import re
import shutil
import time
from fastapi import UploadFile
from typing import List
from app.config import TEMP_DIR, CLEANUP_MAX_AGE_HOURS

def secure_filename(filename: str) -> str:
    if not filename:
        return "unnamed_file"
    filename = re.sub(r'[^a-zA-Z0-9.\-_]', '_', filename)
    filename = os.path.basename(filename)
    filename = filename.lstrip(".-")
    if not filename:
        return "unnamed_file"
    return filename

async def save_upload_file(upload_file: UploadFile, filename: str) -> str:
    safe_filename = secure_filename(filename)
    file_path = os.path.join(TEMP_DIR, safe_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
    return file_path

def cleanup_files(file_paths: List[str]) -> None:
    for file_path in file_paths:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            print(f"Error removing file {file_path}: {e}")

def scheduled_cleanup() -> None:
    try:
        now = time.time()
        max_age_seconds = CLEANUP_MAX_AGE_HOURS * 3600

        for filename in os.listdir(TEMP_DIR):
            file_path = os.path.join(TEMP_DIR, filename)
            if not os.path.isfile(file_path):
                continue

            file_modified_time = os.path.getmtime(file_path)
            age_seconds = now - file_modified_time

            if age_seconds > max_age_seconds:
                try:
                    os.remove(file_path)
                    print(f"Scheduled cleanup: removed {filename}")
                except Exception as e:
                    print(f"Failed to remove {filename} during scheduled cleanup: {e}")
    except Exception as e:
        print(f"Error during scheduled cleanup: {e}")
