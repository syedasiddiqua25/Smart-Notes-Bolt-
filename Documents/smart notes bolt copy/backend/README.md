# Smart Notes - Backend

Flask API server for Smart Notes.

## Prerequisites

This backend uses **Tesseract OCR** for text recognition. You must install
the Tesseract system binary before running the server:

- **Ubuntu/Debian:** `sudo apt install tesseract-ocr`
- **macOS (Homebrew):** `brew install tesseract`
- **Windows:** Download the installer from https://github.com/UB-Mannheim/tesseract/wiki

## Setup

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

## Run

```bash
python app.py
```

Server runs on `http://localhost:5000`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ocr` | Process image with Tesseract OCR |
| POST | `/save-note` | Save/update a note |
| GET | `/get-notes` | Get all notes |
| DELETE | `/delete-note/<id>` | Delete a note |
| POST | `/export-pdf` | Export note as PDF |
| POST | `/export-docx` | Export note as DOCX |
| POST | `/generate-summary` | Generate AI summary |
| GET | `/health` | Health check |
