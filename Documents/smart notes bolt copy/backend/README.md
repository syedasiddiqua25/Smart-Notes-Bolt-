# Smart Notes - Backend

Flask API server for Smart Notes.

## Setup

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

PaddleOCR models are downloaded automatically on first run.

## Run

```bash
python app.py
```

Server runs on `http://localhost:5000`

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
