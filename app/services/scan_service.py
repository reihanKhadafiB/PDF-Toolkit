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
    
    doc = fitz.open()
    
    try:
        for img_path in image_paths:
            if not os.path.exists(img_path):
                raise FileNotFoundError(f"File not found: {img_path}")
            
            # Buka gambar dengan PIL untuk mendapatkan dimensi dan melakukan sharpening
            with Image.open(img_path) as pil_img:
                pil_img = pil_img.convert('RGB')
                
                # Terapkan sharpening untuk memperjelas teks yang mungkin blur akibat JPEG
                # UnsharpMask: radius kecil, kekuatan tinggi, threshold rendah
                pil_img = pil_img.filter(ImageFilter.UnsharpMask(radius=1.5, percent=180, threshold=2))
                
                w_px, h_px = pil_img.size
                
                # Tentukan orientasi A4
                if w_px > h_px:
                    a4_width, a4_height = 841.89, 595.28  # Landscape
                else:
                    a4_width, a4_height = 595.28, 841.89  # Portrait
                
                # Simpan gambar yang sudah di-sharpen ke temp file sementara
                sharp_path = img_path + "_sharp.jpg"
                pil_img.save(sharp_path, "JPEG", quality=98, optimize=False)
                
            # Buat halaman A4 dan masukkan gambar yang sudah tajam
            page = doc.new_page(width=a4_width, height=a4_height)
            page.insert_image(page.rect, filename=sharp_path)
            
            # Hapus file sementara
            if os.path.exists(sharp_path):
                os.remove(sharp_path)
            
        # Simpan PDF dengan kompresi minimal agar kualitas terjaga
        doc.save(output_path, deflate=True, garbage=4)
    finally:
        doc.close()
        
    return output_path
