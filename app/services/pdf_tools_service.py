import os
import shutil
import subprocess
import tempfile
import uuid
from typing import Dict, List

import pymupdf as fitz
from pypdf import PdfReader, PdfWriter

from app.config import TEMP_DIR


def _output_path(suffix: str = ".pdf") -> str:
    return os.path.join(TEMP_DIR, f"tool_{uuid.uuid4().hex}{suffix}")


def organize_pdf(path: str, page_order: List[int], rotations: Dict[str, int]) -> str:
    reader = PdfReader(path)
    if reader.is_encrypted:
        raise ValueError("PDF terkunci. Buka proteksi terlebih dahulu.")
    if not page_order:
        raise ValueError("Pilih setidaknya satu halaman.")
    if len(set(page_order)) != len(page_order) or any(index < 0 or index >= len(reader.pages) for index in page_order):
        raise ValueError("Daftar halaman tidak valid atau berisi duplikat.")
    writer = PdfWriter()
    output_path = _output_path()
    try:
        for index in page_order:
            page = writer.add_page(reader.pages[index])
            degrees = int(rotations.get(str(index), 0)) % 360
            if degrees not in (0, 90, 180, 270):
                raise ValueError("Rotasi harus kelipatan 90 derajat.")
            if degrees:
                page.rotate(degrees)
        with open(output_path, "wb") as output:
            writer.write(output)
        return output_path
    except Exception:
        if os.path.exists(output_path):
            os.remove(output_path)
        raise
    finally:
        writer.close()


def office_to_pdf(path: str) -> str:
    executable = shutil.which("libreoffice") or shutil.which("soffice")
    if not executable:
        raise RuntimeError("LibreOffice tidak ditemukan. Pasang LibreOffice untuk konversi Word ke PDF.")
    output_dir = tempfile.mkdtemp(prefix="office_", dir=TEMP_DIR)
    profile_dir = tempfile.mkdtemp(prefix="lo_profile_", dir=TEMP_DIR)
    try:
        subprocess.run(
            [executable, "-env:UserInstallation=file://" + profile_dir, "--headless",
             "--convert-to", "pdf", "--outdir", output_dir, path],
            check=True, capture_output=True, text=True, timeout=90,
        )
        converted = os.path.join(output_dir, os.path.splitext(os.path.basename(path))[0] + ".pdf")
        if not os.path.exists(converted):
            raise RuntimeError("LibreOffice tidak menghasilkan file PDF.")
        final_path = _output_path()
        shutil.move(converted, final_path)
        return final_path
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError("Konversi melewati batas waktu 90 detik.") from exc
    except subprocess.CalledProcessError as exc:
        raise RuntimeError("LibreOffice gagal mengonversi file. Pastikan dokumen tidak rusak.") from exc
    finally:
        shutil.rmtree(output_dir, ignore_errors=True)
        shutil.rmtree(profile_dir, ignore_errors=True)


def pdf_to_searchable(path: str, language: str = "eng") -> str:
    doc = fitz.open(path)
    output_path = _output_path()
    rebuilt = None
    try:
        rebuilt = fitz.open()
        for page in doc:
            pix = page.get_pixmap(dpi=200, alpha=False)
            out_page = rebuilt.new_page(width=page.rect.width, height=page.rect.height)
            out_page.insert_image(out_page.rect, pixmap=pix)
            ocr_page = page.get_textpage_ocr(language=language, dpi=200, full=True)
            for word in page.get_text("words", textpage=ocr_page):
                x0, y0, x1, y1, text = word[:5]
                if text.strip():
                    word_rect = fitz.Rect(x0, y0, x1, y1) * page.rotation_matrix
                    out_page.insert_text((word_rect.x0, word_rect.y1), text,
                                         fontsize=max(4, word_rect.height), render_mode=3)
        rebuilt.save(output_path, garbage=4, deflate=True)
        return output_path
    except Exception as exc:
        if os.path.exists(output_path):
            os.remove(output_path)
        raise RuntimeError("OCR gagal. Pastikan Tesseract OCR terpasang beserta paket bahasa yang dipilih.") from exc
    finally:
        if rebuilt is not None:
            rebuilt.close()
        doc.close()
