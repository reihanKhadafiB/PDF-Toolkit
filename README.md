# PDF Toolkit

PDF Toolkit is a lightweight, fast, and secure local web application designed for processing PDF files. It allows you to seamlessly merge multiple PDFs into a single document or convert PDF files into editable Word (`.docx`) formats. 

Because all processing is handled locally on your own machine, your sensitive data never leaves your device, ensuring maximum privacy and security.

## ✨ Features

- **Merge PDF**: Combine multiple PDF files into one. Supports drag-and-drop file reordering before merging.
- **PDF to Word**: Convert PDF documents to Word (`.docx`) format with high accuracy.
- **Privacy First**: 100% local processing. No cloud uploads, no data collection.
- **Modern UI**: Clean, professional, and responsive user interface with smooth animations and intuitive UX.
- **Fast Processing**: Powered by FastAPI, ensuring quick response times and efficient file handling in the background.

## 🛠️ Tech Stack

- **Backend**: Python 3, FastAPI, Uvicorn
- **PDF Processing**: `pdf2docx`, `PyPDF2` (or equivalent for merging)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your local machine:
- **Python 3.8+**
- **pip** (Python package installer)

## 🚀 Installation & Setup

To get this project running on your local machine, follow these step-by-step instructions:

1. **Clone the repository**:
   Open your terminal and run the following command to download the project:
   ```bash
   git clone https://github.com/username-anda/nama-repo-anda.git
   ```
   *(Note: Replace `username-anda/nama-repo-anda` with the actual repository URL)*

2. **Navigate to the project directory**:
   ```bash
   cd nama-repo-anda
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

## 💻 Usage

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

## 👨‍💻 Author

- **reihanKhadafiB**

---
*Aman, Cepat, Lokal.*
