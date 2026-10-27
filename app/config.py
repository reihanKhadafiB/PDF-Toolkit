import os
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMP_DIR = os.path.join(BASE_DIR, "temp")
MAX_FILE_SIZE_MB = 10
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
MAX_UPLOAD_FILES = 20
MAX_TOTAL_UPLOAD_BYTES = 50 * 1024 * 1024
MAX_IMAGE_PIXELS = 40_000_000
CLEANUP_MAX_AGE_HOURS = 1
os.makedirs(TEMP_DIR, exist_ok=True)
