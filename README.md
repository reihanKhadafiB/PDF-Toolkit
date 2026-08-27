# PDF Toolkit

PDF Toolkit is a lightweight, fast, and secure local web application designed for processing PDF files. It allows you to seamlessly merge, split, compress, and convert your PDFs, as well as scan documents with high-quality enhancement features.

Because all processing is handled locally on your own machine, your sensitive data never leaves your device, ensuring maximum privacy and security.

## Features

- **Merge PDF**: Combine multiple PDF files into one. Supports drag-and-drop file reordering before merging.
- **Split PDF**: Visually extract specific pages from a PDF. See a preview of all pages and click to select the ones you want to keep.
- **Compress PDF**: Dramatically reduce PDF file sizes (targeting <1MB) using deep Ghostscript optimization.
- **PDF to Word**: Convert PDF documents to Word (`.docx`) format with high accuracy.
- **Document Scanner**: Scan physical documents with CamScanner-like quality. 
  - **Auto-Detect Borders**: Automatically detects document edges using OpenCV.js (Canny edge detection & contours).
  - **Adaptive Filters**: Apply intelligent filters (Magic Color, B&W, Grayscale, Lighten) to enhance text readability, remove shadows, and eliminate edge vignetting.
  - **Backend Sharpening**: Further enhances image sharpness using Pillow's Unsharp Mask before saving to PDF.
- **Image to PDF**: Easily convert standard images (JPG/PNG) into a single PDF document.
- **100% Offline & Secure**: Complete local processing. No internet connection is required after installation.
  - All fonts, JS libraries, and CSS are bundled locally (No CDNs).
  - Hardened security features (Path Traversal prevention, strict CORS, HTTP headers).
  - Strict `.gitignore` prevents sensitive data leaks to GitHub.
- **Modern UI**: Clean, professional, and responsive user interface with smooth animations and intuitive UX.

## Tech Stack

- **Backend**: Python 3.8+, FastAPI, Uvicorn
- **PDF & Image Processing**: `pdf2docx`, `pypdf`, `PyMuPDF` (fitz), `Pillow` (PIL), `Ghostscript`
- **Frontend (Fully Bundled)**: HTML5, CSS3, Vanilla JavaScript, `PDF.js` (for visual splitting), `Cropper.js` (for manual cropping), `OpenCV.js` (for document auto-detection), local Inter Fonts.

## Prerequisites

Before you begin, ensure you have the following installed on your local machine:
- **Python 3.8+**
- **pip** (Python package installer)
- **Ghostscript (gs)**: Required for maximum PDF compression. Ensure `gs` is installed and accessible in your system's PATH.

## Installation & Setup

To get this project running on your local machine, follow these step-by-step instructions:

1. **Clone the repository**:
   Open your terminal and run the following command to download the project:
   ```bash
   git clone https://github.com/reihanKhadafiB/PDF-Toolkit.git
   ```

2. **Navigate to the project directory**:
   ```bash
   cd PDF-Toolkit
   ```

3. **Create and activate a virtual environment** (Highly Recommended):
   This ensures that the project's dependencies don't interfere with your system-wide Python packages.
   ```bash
   # Create the virtual environment
   python3 -m venv venv

   # Activate on Linux/macOS:
   source venv/bin/activate
   
   # Activate on Windows (Command Prompt):
   venv\Scripts\activate
   
   # Activate on Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   ```

4. **Install the required dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

Once you have installed everything, you can start the application using one of the following methods:

### Option 1: Using the bash script (Linux/macOS only)
We have provided a convenience script to start the server:
```bash
# Make the script executable (only needed once)
chmod +x run.sh

# Run the script
./run.sh
```

### Option 2: Manual Execution (Any OS)
If you are on Windows or prefer to run the server manually, ensure your virtual environment is active and run:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Accessing the Web Interface
Once the server is up and running, you will see a message indicating it's listening on port 8000. 
Open your favorite web browser and navigate to:
```
http://localhost:8000
```

## Author

- **reihanKhadafiB**

---
*Aman, Cepat, Lokal.*
