import os
import uuid
import fitz
from PIL import Image, ImageFilter, ImageEnhance
from typing import List
from app.config import TEMP_DIR
def images_to_pdf(image_paths: List[str]) -> str:
    if not image_paths:
        raise ValueError("No images provided")
    output_filename = f"scanned_{uuid.uuid4().hex}.pdf"
    output_path = os.path.join(TEMP_DIR, output_filename)
    intermediate_paths = []
    doc = fitz.open()
    try:
        for img_path in image_paths:
            if not os.path.exists(img_path):
                raise FileNotFoundError(f"File not found: {img_path}")
            with Image.open(img_path) as pil_img:
                pil_img = pil_img.convert('RGB')
                pil_img = pil_img.filter(ImageFilter.UnsharpMask(radius=1.5, percent=180, threshold=2))
                w_px, h_px = pil_img.size
                if w_px > h_px:
                    a4_width, a4_height = 841.89, 595.28
                else:
                    a4_width, a4_height = 595.28, 841.89
                sharp_path = img_path + "_sharp.jpg"
                intermediate_paths.append(sharp_path)
                pil_img.save(sharp_path, "JPEG", quality=98, optimize=False)
            try:
                page = doc.new_page(width=a4_width, height=a4_height)
                page.insert_image(page.rect, filename=sharp_path)
            finally:
                if os.path.exists(sharp_path):
                    os.remove(sharp_path)
        doc.save(output_path, deflate=True, garbage=4)
    except Exception:
        if os.path.exists(output_path):
            os.remove(output_path)
        raise
    finally:
        doc.close()
        for intermediate_path in intermediate_paths:
            if os.path.exists(intermediate_path):
                os.remove(intermediate_path)
    return output_path
