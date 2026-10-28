import json
from typing import List

from fastapi import HTTPException, UploadFile

from app.config import MAX_TOTAL_UPLOAD_BYTES, MAX_UPLOAD_FILES


def ordered_uploads(files: List[UploadFile], order_json: str) -> List[UploadFile]:
    try:
        names = json.loads(order_json)
    except (TypeError, json.JSONDecodeError):
        raise HTTPException(status_code=400, detail="Urutan file harus berupa JSON array.")
    if not isinstance(names, list) or not names or not all(isinstance(name, str) for name in names):
        raise HTTPException(status_code=400, detail="Urutan file tidak valid.")
    if len(files) > MAX_UPLOAD_FILES:
        raise HTTPException(status_code=413, detail=f"Maksimal {MAX_UPLOAD_FILES} file per permintaan.")
    if len(files) != len(names) or len({file.filename for file in files}) != len(files):
        raise HTTPException(status_code=400, detail="File harus memiliki nama unik dan urutan harus mencakup setiap file satu kali.")
    if sum(file.size or 0 for file in files) > MAX_TOTAL_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Total ukuran unggahan melebihi batas 50MB.")
    by_name = {file.filename: file for file in files}
    if len(set(names)) != len(names) or set(names) != set(by_name):
        raise HTTPException(status_code=400, detail="Urutan file tidak cocok dengan file yang diunggah.")
    return [by_name[name] for name in names]
