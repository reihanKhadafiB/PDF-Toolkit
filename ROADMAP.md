# PDF Toolkit roadmap

PDF Toolkit focuses on common document workflows that run on the user's own computer.

## Implemented

- Merge PDFs and choose the input order.
- Convert PDF files to Word documents, with optional local OCR for scanned pages.
- Convert Word DOC/DOCX files to PDF with local LibreOffice.
- Compress PDFs, using Ghostscript when available and a PyMuPDF fallback otherwise.
- Combine PNG/JPEG images into PDF and scan/crop/enhance images in the browser.
- Preview PDF pages, split selected pages, and reorder, rotate, or remove pages.
- Validate upload formats, per-file and total size limits, and image dimensions.
- Delete temporary documents after processing or during scheduled cleanup.

## Product boundary

Cloud uploads, user accounts, paid tiers, and hosted AI processing are outside this project scope. The app is designed to run on localhost; documents are processed locally.

## Licensing

The project uses AGPL-3.0 to align with its required PyMuPDF dependency. Vendored browser assets keep their upstream licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
