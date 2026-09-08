"""
Smart Notes - Flask Backend API
Provides OCR processing with OpenCV preprocessing, Tesseract OEM 3 PSM 6,
spell correction, note management, document export, and AI summary endpoints.
"""

import os
import uuid
import base64
import tempfile
import re
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# In-memory storage (replace with database in production)
notes_store = {}

# Common OCR misspellings for spell correction
SPELL_CORRECTIONS = {
    'teh': 'the', 'adn': 'and', 'taht': 'that', 'tihs': 'this',
    'si': 'is', 'ot': 'to', 'fo': 'for', 'nad': 'and', 'ahve': 'have',
    'hte': 'the', 'wa': 'was', 'hsa': 'has', 'ehr': 'her',
    'wirte': 'write', 'wnat': 'want', 'tyhe': 'they',
    'recieve': 'receive', 'occured': 'occurred', 'seperate': 'separate',
    'definately': 'definitely', 'occassion': 'occasion',
    'accomodate': 'accommodate', 'neccessary': 'necessary',
    'priviledge': 'privilege', 'handwritting': 'handwriting',
    'docuement': 'document', 'procesing': 'processing',
    'digitial': 'digital', 'notebok': 'notebook',
}


def spell_correct(text):
    """Apply basic spell correction to OCR output."""
    def replace_word(match):
        word = match.group(0)
        lower = word.lower()
        if lower in SPELL_CORRECTIONS:
            correction = SPELL_CORRECTIONS[lower]
            if word[0].isupper():
                return correction[0].upper() + correction[1:]
            return correction
        return word
    return re.sub(r'\b\w+\b', replace_word, text)


def clean_ocr_text(text):
    """Clean and normalize OCR output text."""
    cleaned = text.replace('\r\n', '\n')
    cleaned = re.sub(r'\t', '    ', cleaned)
    cleaned = re.sub(r'[^\S\n]+', ' ', cleaned)
    cleaned = re.sub(r'(.)\1{4,}', r'\1\1', cleaned)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    cleaned = re.sub(r'^ +| +$', '', cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r' ([.!?,;:])', r'\1', cleaned)
    cleaned = re.sub(r'\.\.', '.', cleaned)
    cleaned = spell_correct(cleaned)
    return cleaned.strip()


def preprocess_image(img):
    """Preprocess image for better OCR accuracy using OpenCV."""
    import cv2
    import numpy as np

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Increase contrast using CLAHE
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)

    # Denoise
    gray = cv2.fastNlMeansDenoising(gray, h=10)

    # Binarize using Otsu's method
    gray = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]

    # Deskew (correct rotation)
    coords = np.column_stack(np.where(gray > 0))
    if len(coords) > 0:
        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle
        if abs(angle) < 15:  # Only correct small rotations
            h, w = gray.shape
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            gray = cv2.warpAffine(gray, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

    return gray


# --- OCR Endpoints ---

@app.route('/upload-image', methods=['POST'])
def upload_image():
    """Upload an image file for OCR processing."""
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    ext = os.path.splitext(file.filename)[1] or '.png'
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    file.save(tmp.name)
    tmp.close()

    return jsonify({
        'message': 'Image uploaded successfully',
        'path': tmp.name,
        'filename': file.filename
    }), 200


@app.route('/ocr', methods=['POST'])
def ocr_process():
    """Process an image with Tesseract OCR (OEM 3, PSM 6) and OpenCV preprocessing."""
    data = request.get_json()
    image_data = data.get('image') if data else None

    if not image_data:
        return jsonify({'error': 'No image data provided'}), 400

    try:
        import cv2
        import pytesseract
        import numpy as np

        # Decode base64 image
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]

        img_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return jsonify({'error': 'Could not decode image'}), 400

        # Preprocess for better OCR
        processed = preprocess_image(img)

        # Run OCR with OEM 3 (LSTM + Legacy), PSM 6 (single uniform block)
        config = '--oem 3 --psm 6 --preserve-interword-spaces 1'
        text = pytesseract.image_to_string(processed, config=config)

        # Get confidence data
        data_dict = pytesseract.image_to_data(processed, config=config, output_type=pytesseract.Output.DICT)
        conf_values = [int(c) for c in data_dict['conf'] if int(c) > 0]
        avg_confidence = sum(conf_values) / len(conf_values) if conf_values else 0

        # Clean and spell-correct
        cleaned = clean_ocr_text(text)

        return jsonify({
            'text': cleaned,
            'confidence': round(avg_confidence, 2)
        }), 200

    except ImportError:
        return jsonify({
            'text': '',
            'confidence': 0,
            'error': 'OCR libraries not installed. Run: pip install opencv-python pytesseract Pillow'
        }), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# --- Note Management ---

@app.route('/save-note', methods=['POST'])
def save_note():
    """Save or update a note."""
    data = request.get_json()
    if not data or 'title' not in data:
        return jsonify({'error': 'Title is required'}), 400

    note_id = data.get('id', str(uuid.uuid4()))
    now = datetime.utcnow().isoformat()

    note = {
        'id': note_id,
        'title': data['title'],
        'content': data.get('content', ''),
        'theme': data.get('theme', 'white'),
        'wordCount': data.get('wordCount', 0),
        'createdAt': data.get('createdAt', now),
        'updatedAt': now
    }

    notes_store[note_id] = note
    return jsonify(note), 200


@app.route('/get-notes', methods=['GET'])
def get_notes():
    """Get all notes sorted by most recently updated."""
    notes = list(notes_store.values())
    notes.sort(key=lambda n: n['updatedAt'], reverse=True)
    return jsonify(notes), 200


@app.route('/delete-note/<note_id>', methods=['DELETE'])
def delete_note(note_id):
    """Delete a note by ID."""
    if note_id in notes_store:
        del notes_store[note_id]
        return jsonify({'message': 'Note deleted'}), 200
    return jsonify({'error': 'Note not found'}), 404


# --- Export Endpoints ---

@app.route('/export-pdf', methods=['POST'])
def export_pdf():
    """Export a note as PDF with optional theme styling."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    try:
        from fpdf import FPDF

        pdf = FPDF()
        pdf.add_page()
        pdf.set_font('Arial', 'B', 16)
        pdf.cell(0, 10, data.get('title', 'Untitled'), ln=True)
        pdf.set_font('Arial', '', 12)

        content = data.get('content', '')
        for line in content.split('\n'):
            pdf.cell(0, 8, line, ln=True)

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        pdf.output(tmp.name)

        with open(tmp.name, 'rb') as f:
            pdf_b64 = base64.b64encode(f.read()).decode()

        os.unlink(tmp.name)
        return jsonify({'pdf': pdf_b64}), 200

    except ImportError:
        return jsonify({'error': 'fpdf not installed. Run: pip install fpdf2'}), 503


@app.route('/export-docx', methods=['POST'])
def export_docx():
    """Export a note as DOCX."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    try:
        from docx import Document as DocxDocument

        doc = DocxDocument()
        doc.add_heading(data.get('title', 'Untitled'), level=1)

        content = data.get('content', '')
        for line in content.split('\n'):
            doc.add_paragraph(line)

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.docx')
        doc.save(tmp.name)

        with open(tmp.name, 'rb') as f:
            docx_b64 = base64.b64encode(f.read()).decode()

        os.unlink(tmp.name)
        return jsonify({'docx': docx_b64}), 200

    except ImportError:
        return jsonify({'error': 'python-docx not installed. Run: pip install python-docx'}), 503


# --- AI Summary ---

@app.route('/generate-summary', methods=['POST'])
def generate_summary():
    """Generate an AI summary of note content using extractive summarization."""
    data = request.get_json()
    if not data or 'content' not in data:
        return jsonify({'error': 'Content is required'}), 400

    content = data['content']
    if not content.strip():
        return jsonify({'short': '', 'medium': '', 'keyPoints': []}), 200

    sentences = [s.strip() for s in content.replace('\n', ' ').split('.') if len(s.strip()) > 10]

    short = '. '.join(sentences[:2]) + '.' if sentences else ''
    medium = '. '.join(sentences[:5]) + '.' if sentences else ''

    # Keyword-based key point extraction
    words = content.lower().split()
    freq = {}
    stop_words = {
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'and', 'or', 'but',
        'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'this',
        'that', 'it', 'its', 'not', 'have', 'has', 'had', 'do', 'does', 'did',
        'will', 'would', 'could', 'should', 'can', 'may', 'might', 'shall',
    }

    for w in words:
        clean = ''.join(c for c in w if c.isalnum())
        if len(clean) > 3 and clean not in stop_words:
            freq[clean] = freq.get(clean, 0) + 1

    scored = []
    for s in sentences:
        score = sum(freq.get(w.strip('.,!?;:'), 0) for w in s.lower().split())
        scored.append((s, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    key_points = [s for s, _ in scored[:5]]

    return jsonify({
        'short': short,
        'medium': medium,
        'keyPoints': key_points
    }), 200


# --- Health Check ---

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'version': '1.0.0'}), 200


if __name__ == '__main__':
    app.run(debug=True, port=5000)
