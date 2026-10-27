# PDF Toolkit

A local web app for common PDF and document-scanning tasks. Files are processed by the backend running on your machine; the frontend libraries are bundled with the project.

## Features

- **Merge PDFs** — combine files and reorder them before processing.
- **Split PDFs** — preview pages, select the pages to keep, and download the result.
- **Compress PDFs** — use Ghostscript when available, with a PyMuPDF fallback.
- **PDF to Word** — convert PDF documents to DOCX.
- **Images to PDF** — combine PNG or JPEG images into a PDF.
- **Document scan** — crop and enhance images in the browser, then save them as a PDF.

## Requirements

- Python 3.10 or later
- `pip`
- Ghostscript is optional and recommended for PDF compression. Without it, compression uses the PyMuPDF fallback.

## Quick start

```bash
git clone https://github.com/reihanKhadafiB/PDF-Toolkit.git
cd PDF-Toolkit
python -m venv .venv
```

Activate the virtual environment:

```bash
# Linux / macOS
source .venv/bin/activate

# Windows PowerShell
.venv\Scripts\Activate.ps1

# Windows Command Prompt
.venv\Scripts\activate.bat
```

Install dependencies and start the app:

```bash
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Open [http://localhost:8000](http://localhost:8000) in your browser. To stop the server, press `Ctrl+C` in the terminal.

On Linux or macOS, you can also start the app with `./run.sh` after creating the `.venv` directory as shown above.

## Upload limits

- Maximum file size: **10 MB per file**
- Maximum request size: **50 MB total**
- Maximum files in a multi-file request: **20**
- Maximum image dimensions: **40 megapixels per image**

The browser may also apply file-type and size checks before upload. The backend performs its own validation.

## API

The web app uses these endpoints:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/merge` | Merge PDF files |
| `POST` | `/api/split` | Extract selected pages from a PDF |
| `POST` | `/api/compress` | Compress a PDF |
| `POST` | `/api/convert/pdf-to-word` | Convert PDF to DOCX |
| `POST` | `/api/scan-to-pdf` | Create a PDF from uploaded images |

## Privacy and network access

By default, the server binds to `127.0.0.1`, so it accepts connections only from the same machine. Uploaded files are processed locally and temporary files are removed after processing or by scheduled cleanup. Do not change the bind address to expose this app on a network unless you have added appropriate access controls and deployment protections.

## Project structure

```text
app/
  api/        HTTP endpoints
  core/       upload validation and temporary-file handling
  services/   PDF and image processing
static/       web interface and bundled browser libraries
temp/         temporary processing files
```

## Troubleshooting

- **`gs` not found:** compression will use the PyMuPDF fallback. Install Ghostscript to use Ghostscript-based compression.
- **Upload rejected:** check the per-file, total-request, file-count, and image-dimension limits above.
- **PDF conversion fails:** encrypted, damaged, or unusually complex PDFs may not convert successfully.

## Maintainer

[reihanKhadafiB](https://github.com/reihanKhadafiB)
