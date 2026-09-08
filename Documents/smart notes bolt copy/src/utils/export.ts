import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { ExportFormat, NotebookTheme } from '../types';

interface ExportOptions {
  fontFamily: string;
  fontSize: string;
  lineSpacing: string;
}

export async function exportNote(
  title: string,
  contentHtml: string,
  contentText: string,
  format: ExportFormat,
  theme: NotebookTheme,
  includeStyle: boolean,
  options: ExportOptions
): Promise<void> {
  switch (format) {
    case 'pdf':
      exportPDF(title, contentHtml, contentText, theme, includeStyle, options);
      break;
    case 'docx':
      await exportDOCX(title, contentHtml, contentText, includeStyle, options);
      break;
    case 'txt':
      exportTXT(title, contentText);
      break;
  }
}

// Parse HTML content for formatting info
interface ParsedNode {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  highlight?: string;
  fontSize?: number;
  fontFamily?: string;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  isList?: boolean;
  isOrderedList?: boolean;
}

function parseHtmlFormatting(html: string): ParsedNode[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const nodes: ParsedNode[] = [];

  function extractStyles(element: Element): Partial<ParsedNode> {
    const styles: Partial<ParsedNode> = {};
    const style = element.getAttribute('style') || '';

    // Parse inline styles
    const colorMatch = style.match(/color:\s*([^;]+)/i);
    if (colorMatch) styles.color = colorMatch[1].trim();

    const bgColorMatch = style.match(/background-color:\s*([^;]+)/i);
    if (bgColorMatch) styles.highlight = bgColorMatch[1].trim();

    // Check tag names
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'b' || tagName === 'strong') styles.bold = true;
    if (tagName === 'i' || tagName === 'em') styles.italic = true;
    if (tagName === 'u') styles.underline = true;

    // Check font family
    const fontMatch = style.match(/font-family:\s*([^;]+)/i);
    if (fontMatch) styles.fontFamily = fontMatch[1].trim().replace(/['"]/g, '');

    return styles;
  }

  function walkNode(node: Node, inherited: Partial<ParsedNode> = {}) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text.trim()) {
        nodes.push({ text, ...inherited });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const styles = { ...inherited, ...extractStyles(element) };

      // Handle lists
      if (element.tagName === 'LI') {
        const parent = element.parentElement;
        nodes.push({
          text: element.textContent || '',
          ...styles,
          isList: true,
          isOrderedList: parent?.tagName === 'OL',
        });
        return;
      }

      // Handle alignment
      const align = element.getAttribute('align');
      if (align) styles.alignment = align as ParsedNode['alignment'];
      const styleAlign = element.getAttribute('style')?.match(/text-align:\s*([^;]+)/i)?.[1];
      if (styleAlign) styles.alignment = styleAlign as ParsedNode['alignment'];

      // Handle font size from <font> tag
      if (element.tagName === 'FONT') {
        const sizeAttr = element.getAttribute('size');
        if (sizeAttr) styles.fontSize = parseInt(sizeAttr);
      }

      for (const child of element.childNodes) {
        walkNode(child, styles);
      }
    }
  }

  for (const child of doc.body.childNodes) {
    walkNode(child);
  }

  return nodes;
}

function exportPDF(
  title: string,
  contentHtml: string,
  contentText: string,
  theme: NotebookTheme,
  includeStyle: boolean,
  options: ExportOptions
): void {
  const doc = new jsPDF();
  const pageW = 210;
  const pageH = 297;
  const marginL = includeStyle && theme === 'spiral' ? 30 : 20;
  const marginR = 20;
  const contentW = pageW - marginL - marginR;

  const lineHeight = 32 * parseFloat(options.lineSpacing);
  let currentY = 25;

  // Background colors
  if (includeStyle) {
    switch (theme) {
      case 'dark':
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageW, pageH, 'F');
        doc.setTextColor(226, 232, 240);
        break;
      case 'ruled':
        doc.setFillColor(255, 251, 235);
        doc.rect(0, 0, pageW, pageH, 'F');
        break;
      case 'spiral':
        doc.setFillColor(239, 246, 255);
        doc.rect(0, 0, pageW, pageH, 'F');
        break;
      case 'grid':
        doc.setFillColor(240, 253, 244);
        doc.rect(0, 0, pageW, pageH, 'F');
        break;
      case 'dotted':
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, pageW, pageH, 'F');
        break;
    }
  }

  // Draw notebook patterns
  if (includeStyle) {
    const startY = 45;

    switch (theme) {
      case 'ruled':
        doc.setDrawColor(212, 184, 150);
        doc.setLineWidth(0.3);
        for (let y = startY; y < pageH - 20; y += lineHeight) {
          doc.line(marginL, y, pageW - marginR, y);
        }
        break;

      case 'spiral':
        doc.setDrawColor(139, 92, 246);
        doc.setLineWidth(0.5);
        doc.line(marginL - 2, 20, marginL - 2, pageH - 20);
        doc.setDrawColor(147, 197, 253);
        doc.setLineWidth(0.3);
        for (let y = startY; y < pageH - 20; y += lineHeight) {
          doc.line(marginL, y, pageW - marginR, y);
        }
        break;

      case 'grid':
        doc.setDrawColor(134, 239, 172);
        doc.setLineWidth(0.2);
        for (let y = startY; y < pageH - 20; y += lineHeight) {
          doc.line(marginL, y, pageW - marginR, y);
        }
        for (let x = marginL; x <= pageW - marginR; x += lineHeight) {
          doc.line(x, startY, x, pageH - 20);
        }
        break;

      case 'dotted':
        doc.setFillColor(148, 163, 184);
        for (let y = startY; y < pageH - 20; y += lineHeight) {
          for (let x = marginL + lineHeight / 2; x < pageW - marginR; x += lineHeight) {
            doc.circle(x, y, 0.5, 'F');
          }
        }
        break;
    }
  }

  // Set default text color
  if (!includeStyle || theme !== 'dark') {
    doc.setTextColor(17, 24, 39);
  }

  // Title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(title, marginL, currentY);
  currentY += 15;

  // Content based on includeStyle
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  currentY = 50;

  if (includeStyle) {
    // Parse HTML and preserve some formatting
    const parsed = parseHtmlFormatting(contentHtml);
    for (const node of parsed) {
      // Check if we need a new page
      if (currentY > pageH - 30) {
        doc.addPage();
        currentY = 20;
      }

      // Apply font style
      if (node.bold) doc.setFont('helvetica', 'bold');
      else doc.setFont('helvetica', 'normal');

      // Write text
      const lines = doc.splitTextToSize(node.text, contentW);
      doc.text(lines, marginL, currentY);
      currentY += lines.length * (lineHeight / 3);
    }
  } else {
    // Plain text export
    const lines = doc.splitTextToSize(contentText, contentW);
    doc.text(lines, marginL, currentY);
  }

  doc.save(`${title}.pdf`);
}

async function exportDOCX(
  title: string,
  contentHtml: string,
  contentText: string,
  includeStyle: boolean,
  options: ExportOptions
): Promise<void> {
  const lineHeight = parseFloat(options.lineSpacing) * 240; // twips

  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 36,
          font: mapFontFamily(options.fontFamily),
        }),
      ],
      spacing: { after: lineHeight },
    })
  );

  if (includeStyle) {
    // Parse HTML formatting
    const parsed = parseHtmlFormatting(contentHtml);

    for (const node of parsed) {
      const runs: TextRun[] = [
        new TextRun({
          text: node.text,
          bold: node.bold,
          italics: node.italic,
          color: node.color ? node.color.replace('#', '') : undefined,
          font: node.fontFamily ? mapFontFamily(node.fontFamily) : mapFontFamily(options.fontFamily),
          size: node.fontSize ? node.fontSize * 2 : parseInt(options.fontSize) * 12,
        }),
      ];

      children.push(
        new Paragraph({
          children: runs,
          spacing: { line: lineHeight },
          alignment: node.alignment
            ? node.alignment === 'center'
              ? AlignmentType.CENTER
              : node.alignment === 'right'
                ? AlignmentType.RIGHT
                : node.alignment === 'justify'
                  ? AlignmentType.BOTH
                  : AlignmentType.LEFT
            : AlignmentType.LEFT,
        })
      );
    }
  } else {
    // Plain text
    const paragraphs = contentText.split('\n');
    for (const para of paragraphs) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: para || ' ', size: 24 })],
          spacing: { line: 360 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${title}.docx`);
}

function mapFontFamily(font: string): string {
  const fontMap: Record<string, string> = {
    Inter: 'Calibri',
    Arial: 'Arial',
    Georgia: 'Georgia',
    'Courier New': 'Courier New',
    'Times New Roman': 'Times New Roman',
    Caveat: 'Calibri',
    'Indie Flower': 'Calibri',
    Kalam: 'Calibri',
    'Patrick Hand': 'Calibri',
    'Dancing Script': 'Calibri',
  };
  return fontMap[font] || 'Calibri';
}

function exportTXT(title: string, contentText: string): void {
  const separator = '='.repeat(Math.max(title.length, 40));
  const text = `${title}\n${separator}\n\n${contentText}`;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `${title}.txt`);
}
