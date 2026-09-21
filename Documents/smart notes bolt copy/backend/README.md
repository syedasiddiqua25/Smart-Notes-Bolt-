# Smart Notes - Backend

Flask API server for Smart Notes, providing OCR via PaddleOCR.

## Prerequisites

**Python 3.11 is required.** PaddlePaddle does not provide wheels for
Python 3.12 or 3.13, and has no support for Python 3.14. Use a dedicated
3.11 environment to run this backend.

### Install Python 3.11

- **Ubuntu/Debian:** `sudo apt install python3.11 python3.11-venv`
- **macOS (Homebrew):** `brew install python@3.11`
- **Windows:** Download from https://www.python.org/downloads/release/python-3119/

## Setup

```bash
# Create a virtualenv using Python 3.11
python3.11 -m venv venv
source venv/bin/activate    # Linux/Mac
# venv\Scripts\activate     # Windows

pip install --upgrade pip
pip install -r requirements.txt
```

## Run

```bash
python app.py
```

Server runs on `http://localhost:5000`

> On first OCR request, PaddleOCR downloads its detection and recognition
> models (~100 MB). Subsequent requests are fast.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ocr` | Process image with PaddleOCR |
| POST | `/save-note` | Save/update a note |
| GET | `/get-notes` | Get all notes |
| DELETE | `/delete-note/<id>` | Delete a note |
| POST | `/export-pdf` | Export note as PDF |
| POST | `/export-docx` | Export note as DOCX |
| POST | `/generate-summary` | Generate AI summary |
| GET | `/health` | Health check |
