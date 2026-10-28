# PDF Toolkit

A local-first web app for PDF and document-scanning tasks. The backend runs on your computer, and the default server address is restricted to your own machine. There are no accounts or cloud processing.

## Features

- **Merge PDFs** — combine files and reorder them before processing.
- **PDF to Word** — convert PDF documents to DOCX, with optional local OCR for scanned pages.
- **Word to PDF** — convert DOC and DOCX documents using LibreOffice installed on this computer.
- **Compress PDFs** — use Ghostscript when available, with a PyMuPDF fallback.
- **Images to PDF** — combine PNG or JPEG images into a PDF.
- **Document scanner** — crop and enhance images in the browser, then save them as a PDF.
- **Split PDFs** — preview pages, select pages, and download the result.
- **Organize pages** — reorder, rotate, or remove pages.

All document processing runs locally. Conversion quality depends on the source document and local tools installed.

## Requirements

- Python 3.10 or later
- `pip`
- Ghostscript is optional and recommended for PDF compression. Without it, compression uses the PyMuPDF fallback.
- LibreOffice is required for Word-to-PDF conversion.
- Tesseract OCR plus the relevant language data is required for OCR. For example, install English (`eng`) or Indonesian (`ind`) data locally.

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

For local OCR, install Tesseract and its English (`eng`) or Indonesian (`ind`) language data, then choose the document language in the PDF-to-Word tool. For Word-to-PDF conversion, install LibreOffice using your operating system's package manager. It is invoked locally by the backend.

## Upload limits

- Maximum file size: **10 MB per file**
- Maximum request size: **50 MB total**
- Maximum files in a multi-file request: **20**
- Maximum image dimensions: **40 megapixels per image**

The browser may also apply file-type and size checks before upload. The backend performs its own validation.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/merge` | Merge PDF files |
| `POST` | `/api/split` | Extract selected pages from a PDF |
| `POST` | `/api/compress` | Compress a PDF |
| `POST` | `/api/convert/pdf-to-word` | Convert PDF to DOCX |
| `POST` | `/api/scan-to-pdf` | Create a PDF from uploaded images |
| `POST` | `/api/tools/organize` | Reorder, rotate, or remove pages |
| `POST` | `/api/tools/office-to-pdf` | Convert a Word document to PDF with LibreOffice |

The interactive API schema is available at [http://localhost:8000/docs](http://localhost:8000/docs) while the app is running.

## Privacy and network access

By default, the server binds to `127.0.0.1`, so it accepts connections only from the same machine. Uploaded files are processed locally and temporary files are removed after processing or by scheduled cleanup. Do not change the bind address to expose this app on a network unless you have added appropriate access controls and deployment protections.

## Project structure

```text
app/
  api/        HTTP endpoints
  core/       upload validation and temporary-file handling
  services/   PDF and image processing
static/       web interface and bundled browser libraries
  js/         shared browser helpers and one module per tool
  styles/     feature and visual-theme styles
temp/         temporary processing files
```

## Troubleshooting

- **`gs` not found:** compression will use the PyMuPDF fallback. Install Ghostscript to use Ghostscript-based compression.
- **Upload rejected:** check the per-file, total-request, file-count, and image-dimension limits above.
- **PDF conversion fails:** encrypted, damaged, or unusually complex PDFs may not convert successfully.
- **Word-to-PDF says LibreOffice is missing:** install LibreOffice, then restart the app.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the local-first project principles and contribution workflow.

See [ROADMAP.md](ROADMAP.md) for the delivered local feature scope.

## Maintainer

[reihanKhadafiB](https://github.com/reihanKhadafiB)

## License

PDF Toolkit is licensed under the **GNU Affero General Public License v3.0**. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for project and bundled dependency licensing details. PyMuPDF is an AGPL-3.0 runtime dependency for open-source use. If you redistribute a modified version or make it available as a network service, review the AGPL terms that apply to that use.
