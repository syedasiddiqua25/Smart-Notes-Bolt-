"""
Smart Notes - Flask Backend API
Provides OCR processing with PaddleOCR, note management,
document export, and AI summary endpoints.
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
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32 MB max request body

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


def order_lines_reading_order(lines):
    """Sort OCR lines into natural reading order using bounding boxes.

    PaddleOCR returns lines in internal detection order (patch-by-patch),
    not top-to-bottom / left-to-right.  Each line carries a bounding box
    with four corner points:
        [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]

    We compute each box's vertical and horizontal centre, group boxes that
    sit on the same visual row (vertical centres within half the median
    box height), sort each row left-to-right, then sort rows top-to-bottom.
    Lines on the same row are joined with a space; rows are joined with a
    newline.
    """
    if not lines:
        return []

    # Extract (vcenter, hcenter, height, text, conf) for each line
    entries = []
    for line in lines:
        if line is None:
            continue
        box = line[0]
        text = line[1][0]
        conf = line[1][1]

        xs = [p[0] for p in box]
        ys = [p[1] for p in box]
        hcenter = sum(xs) / 4
        vcenter = sum(ys) / 4
        height = max(ys) - min(ys)

        entries.append({
            'vcenter': vcenter,
            'hcenter': hcenter,
            'height': height,
            'text': text,
            'conf': conf,
        })

    if not entries:
        return []

    # Median box height → row-grouping tolerance
    heights = sorted(e['height'] for e in entries)
    median_height = heights[len(heights) // 2]
    tolerance = median_height * 0.5

    # Sort by vertical centre so we can sweep top-to-bottom
    entries.sort(key=lambda e: e['vcenter'])

    # Group into rows: lines whose vcenters are within `tolerance` of the
    # row's anchor vcenter belong to the same row.
    rows = []
    current_row = [entries[0]]
    row_vcenter = entries[0]['vcenter']

    for entry in entries[1:]:
        if abs(entry['vcenter'] - row_vcenter) <= tolerance:
            current_row.append(entry)
        else:
            rows.append(current_row)
            current_row = [entry]
            row_vcenter = entry['vcenter']
    rows.append(current_row)

    # Within each row sort left-to-right; join with spaces.
    # Join rows with newlines.
    ordered_texts = []
    ordered_confs = []
    for row in rows:
        row.sort(key=lambda e: e['hcenter'])
        ordered_texts.append(' '.join(e['text'] for e in row))
        for e in row:
            if e['conf'] is not None and e['conf'] > 0:
                ordered_confs.append(e['conf'])

    return ordered_texts, ordered_confs


# --- PaddleOCR Engine (lazy-loaded singleton) ---

_ocr_engine = None


def get_ocr_engine():
    """Lazily initialize the PaddleOCR engine on first use."""
    global _ocr_engine
    if _ocr_engine is not None:
        return _ocr_engine

    from paddleocr import PaddleOCR

    _ocr_engine = PaddleOCR(
        use_angle_cls=True,
        lang='en',
        show_log=False,
        drop_score=0.3,
    )
    return _ocr_engine


# --- OCR Endpoint ---

@app.route('/ocr', methods=['POST'])
def ocr_process():
    """Process an image with PaddleOCR and return extracted text + confidence."""
    data = request.get_json()
    image_data = data.get('image') if data else None

    if not image_data:
        return jsonify({'error': 'No image data provided'}), 400

    try:
        import cv2
        import numpy as np

        # Decode base64 image
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]

        img_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return jsonify({'error': 'Could not decode image'}), 400

        # Run PaddleOCR
        engine = get_ocr_engine()
        result = engine.ocr(img, cls=True)

        # PaddleOCR returns a list of pages; each page is a list of lines.
        # Each line: [bbox, (text, confidence)]
        # Flatten all pages into a single list of lines.
        all_lines = []
        for page in result:
            if page is None:
                continue
            for line in page:
                if line is None:
                    continue
                all_lines.append(line)

        # Sort lines into reading order using bounding-box coordinates.
        ordered_texts, ordered_confs = order_lines_reading_order(all_lines)

        full_text = '\n'.join(ordered_texts)
        avg_confidence = round(sum(ordered_confs) / len(ordered_confs) * 100, 2) if ordered_confs else 0

        # Split into paragraphs
        paragraphs = [p.strip() for p in full_text.split('\n\n') if p.strip()]

        # Clean and spell-correct
        cleaned = clean_ocr_text(full_text)
        cleaned_paragraphs = [clean_ocr_text(p) for p in paragraphs if p.strip()]

        return jsonify({
            'text': cleaned,
            'confidence': avg_confidence,
            'paragraphs': cleaned_paragraphs,
        }), 200

    except ImportError:
        return jsonify({
            'text': '',
            'confidence': 0,
            'error': 'PaddleOCR not installed. Run: pip install paddleocr paddlepaddle'
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
    return jsonify({'status': 'ok', 'version': '2.0.0'}), 200


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(
        debug=os.environ.get('FLASK_DEBUG', '0') == '1',
        host='0.0.0.0',
        port=port,
    )
