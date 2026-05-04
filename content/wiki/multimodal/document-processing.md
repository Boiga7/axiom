---
type: concept
category: multimodal
tags: [document-processing, pdf, ocr, table-extraction, claude-vision, unstructured, pymupdf, docling]
sources: []
updated: 2026-05-01
para: resource
tldr: Claude is the strongest model for document understanding — send PDFs directly via the API or Files API; for pipeline scale, pair pymupdf/unstructured for extraction with Claude for interpretation.
---

# Document Processing with AI

> **TL;DR** Claude is the strongest model for document understanding — send PDFs directly via the API or Files API; for pipeline scale, pair pymupdf/unstructured for extraction with Claude for interpretation.

Extracting structured information from PDFs, Word documents, financial statements, legal contracts, and technical drawings. Claude's vision is strongest here among frontier models. The choice is: send the document directly to Claude, or extract text first and use it as context.

---

## Direct PDF via Claude API

The simplest approach for up to ~50-page PDFs:

```python
import anthropic
import base64

client = anthropic.Anthropic()

with open("contract.pdf", "rb") as f:
    pdf_data = base64.standard_b64encode(f.read()).decode("utf-8")

response = client.messages.create(
    model="claude-opus-4-7",  # Opus for complex documents
    max_tokens=4096,
    messages=[{
        "role": "user",
        "content": [
            {
                "type": "document",
                "source": {
                    "type": "base64",
                    "media_type": "application/pdf",
                    "data": pdf_data,
                }
            },
            {
                "type": "text",
                "text": "Extract all payment terms, penalties, and termination clauses. Format as a structured JSON."
            }
        ]
    }]
)

print(response.content[0].text)
```

**When to use direct PDF:** Documents up to ~50 pages, complex layouts (tables, charts, mixed text/image), legal/financial documents where OCR would lose structure.

---

## Files API for Large or Repeated Documents

The Files API avoids re-encoding base64 on every call. Upload once, reference by ID:

```python
import anthropic

client = anthropic.Anthropic()

# Upload once
with open("annual_report_2025.pdf", "rb") as f:
    file_response = client.beta.files.upload(
        file=("annual_report_2025.pdf", f, "application/pdf"),
    )

file_id = file_response.id
print(f"Uploaded: {file_id}")  # file-xxxxxxxx

# Reference by ID on every query — no re-upload
for question in ["What was total revenue?", "List all subsidiaries.", "Key risk factors?"]:
    response = client.beta.messages.create(
        model="claude-opus-4-7",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "document",
                    "source": {"type": "file", "file_id": file_id}
                },
                {"type": "text", "text": question}
            ]
        }],
        betas=["files-api-2025-04-14"],
    )
    print(f"Q: {question}")
    print(f"A: {response.content[0].text}\n")

# Clean up when done
client.beta.files.delete(file_id)
```

Files API is the right choice for: batch processing the same document, interactive Q&A sessions, or any document >20MB where base64 encoding adds latency.

---

## Table Extraction

Claude handles complex tables far better than OCR tools. Request structured output explicitly:

```python
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=2048,
    messages=[{
        "role": "user",
        "content": [
            {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": pdf_data}},
            {
                "type": "text",
                "text": """Extract all tables from this document. For each table:
1. Give it a descriptive name based on its header
2. Output as a JSON array with column names as keys
3. Preserve exact numeric values

Return format:
{"tables": [{"name": "...", "data": [{"col1": val1, ...}]}]}"""
            }
        ]
    }]
)

import json
tables = json.loads(response.content[0].text)
```

---

## Text-First Pipeline (Scale)

For high-volume document processing, extract text with `pymupdf` or `unstructured` first, then use Claude for interpretation. Avoids vision API costs on text-heavy documents.

### PyMuPDF (Fast, Accurate)

```python
import fitz  # pip install pymupdf

def extract_text_pymupdf(pdf_path: str) -> str:
    """Extract text preserving basic structure."""
    doc = fitz.open(pdf_path)
    pages = []

    for page_num, page in enumerate(doc):
        text = page.get_text("text")  # plain text
        blocks = page.get_text("blocks")  # with position info

        # Alternative: get markdown-like structure
        md = page.get_text("markdown")
        pages.append(f"--- Page {page_num + 1} ---\n{md}")

    return "\n\n".join(pages)


def extract_tables_pymupdf(pdf_path: str) -> list[dict]:
    """Extract tables using PyMuPDF's built-in table finder."""
    doc = fitz.open(pdf_path)
    all_tables = []

    for page_num, page in enumerate(doc):
        tables = page.find_tables()
        for table in tables:
            df = table.to_pandas()
            all_tables.append({
                "page": page_num + 1,
                "data": df.to_dict(orient="records"),
                "bbox": table.bbox,
            })

    return all_tables
```

### Unstructured (Handles More Formats)

```python
from unstructured.partition.auto import partition  # pip install unstructured

# Works for PDF, DOCX, PPTX, HTML, images, emails
elements = partition("document.pdf")

# Group by type
from unstructured.staging.base import elements_to_json
print(elements_to_json(elements))

# Extract specific element types
from unstructured.documents.elements import Table, Title, NarrativeText

tables = [el for el in elements if isinstance(el, Table)]
headings = [el for el in elements if isinstance(el, Title)]
paragraphs = [el for el in elements if isinstance(el, NarrativeText)]
```

Unstructured handles `.pdf`, `.docx`, `.pptx`, `.html`, `.msg` (email), and scanned images. Slower than PyMuPDF but broader format support.

### Then Claude for Interpretation

```python
def answer_from_document(pdf_path: str, question: str) -> str:
    text = extract_text_pymupdf(pdf_path)

    # Truncate if > 100K characters (fits in Claude's context)
    if len(text) > 100_000:
        text = text[:100_000] + "\n[Document truncated...]"

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": f"<document>\n{text}\n</document>\n\n{question}"
        }]
    )
    return response.content[0].text
```

---

## OCR for Scanned Documents

When documents are scanned images rather than digital PDFs:

### Claude Direct (Best Quality)

```python
# Send as image, not document — scanned PDFs are images
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=2048,
    messages=[{
        "role": "user",
        "content": [
            {
                "type": "image",
                "source": {"type": "base64", "media_type": "image/png", "data": page_image_b64}
            },
            {"type": "text", "text": "Transcribe all text from this scanned document page."}
        ]
    }]
)
```

### Tesseract (Local, Free)

```python
import pytesseract  # pip install pytesseract
from PIL import Image

# Install tesseract: brew install tesseract (Mac) or apt install tesseract-ocr
image = Image.open("scanned_page.png")

# Basic OCR
text = pytesseract.image_to_string(image, lang="eng")

# With confidence scores
data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
```

Tesseract accuracy: ~85-95% on clean printed text; degrades significantly on handwriting, unusual fonts, low resolution (<300dpi).

### Docling (IBM, Best Open-Source)

```python
from docling.document_converter import DocumentConverter  # pip install docling

converter = DocumentConverter()
result = converter.convert("document.pdf")

# Exports to markdown, JSON, or HTML
markdown = result.document.export_to_markdown()
```

Docling handles complex layouts, tables, and figures better than raw PyMuPDF. Uses a local vision model. No API costs.

---

## Choosing the Right Approach

| Scenario | Recommended |
|---|---|
| Single PDF, complex layout, <50 pages | Claude direct (PDF document block) |
| Same document queried many times | Files API upload |
| High volume, text-heavy, cost-sensitive | PyMuPDF extract → Claude interpret |
| Multiple formats (DOCX, PPTX, email) | unstructured → Claude |
| Scanned images, highest accuracy | Claude vision (send as image) |
| Scanned images, free, local | Tesseract or Docling |
| 50-page+ technical report with charts | Claude Opus direct PDF |

---

## Key Facts

- Claude Opus handles complex document layouts (multi-column, nested tables, mixed text/image) better than GPT-4V
- Files API: upload PDF once with `client.beta.files.upload()`, reference by `file_id` in subsequent calls; avoids repeated base64 encoding
- PyMuPDF (`fitz`) is faster and more accurate than pdfplumber for most PDFs; `page.find_tables()` in PyMuPDF 1.24+ handles table extraction natively
- Unstructured: handles 20+ file formats including scanned images; slower but broadest format coverage
- Docling (IBM, 2024): best open-source document pipeline; handles complex layouts with a local vision model
- OCR limit: Claude vision handles handwriting better than Tesseract; Tesseract is free and local but accuracy drops on non-standard text

## Common Failure Cases

**`json.loads(response.content[0].text)` raises `JSONDecodeError` when Claude includes a preamble before the JSON in its table extraction response**  
Why: Claude occasionally prefixes structured output with an explanation like "Here are the tables I found:" before the JSON block; `json.loads` fails on any non-JSON prefix, even a single sentence.  
Detect: `JSONDecodeError` occurs intermittently (10-20% of requests); printing `response.content[0].text` shows the JSON preceded by a natural language sentence.  
Fix: extract JSON using a regex: `re.search(r'\{.*\}', text, re.DOTALL).group()`; or instruct the model explicitly: "Return only valid JSON, no preamble or explanation."

**Files API `file_id` returns a 404 error because the file expired — Files API files are deleted after 30 days**  
Why: the Anthropic Files API stores files for a maximum of 30 days; if an application caches `file_id` values in a database without tracking expiry, requests using old IDs fail after the file is automatically deleted.  
Detect: requests that worked previously start returning `404 Not Found` for the file reference; the `created_at` timestamp on the file object is over 30 days old.  
Fix: store `created_at` alongside `file_id` and re-upload when `created_at + 30 days < now()`; or call `client.beta.files.list()` at startup to validate which IDs are still valid.

**PyMuPDF `page.find_tables()` returns empty results for a PDF that clearly contains tables because the tables are embedded as images**  
Why: `find_tables()` uses structural heuristics to detect tables drawn with vector lines; tables that are screenshots or scanned images embedded in the PDF are invisible to this method, which only operates on text and drawing commands.  
Detect: the PDF visually shows a table but `find_tables()` returns an empty list; opening the PDF in a text editor (or running `page.get_text()`) shows no text in the table region.  
Fix: for image-embedded tables, use the direct Claude PDF approach (send the PDF as a document block) rather than PyMuPDF text extraction; Claude's vision handles image-embedded tables correctly.

**Truncating the document text to 100,000 characters cuts in the middle of a sentence or a table row, corrupting the context sent to Claude**  
Why: `text[:100_000]` slices at a byte offset without regard to word or sentence boundaries; the truncated text may end mid-word, mid-sentence, or mid-table-row, reducing extraction quality for the last visible content.  
Detect: Claude's extraction for the last section of the document is incomplete or garbled; the truncation boundary falls inside a structured element (table row, numbered list item).  
Fix: truncate at a paragraph boundary using `text[:100_000].rsplit('\n', 1)[0]`; or use PyMuPDF's page-by-page extraction to truncate at a page boundary instead of a character offset.

## Connections

- [[multimodal/vision]] — VLM fundamentals and sending images to Claude
- [[apis/anthropic-api]] — Files API, document block type, prompt caching for repeated documents
- [[rag/pipeline]] — document processing feeds the ingestion stage of RAG systems
- [[rag/chunking]] — after extraction, how to chunk document text for vector storage
- [[infra/vector-stores]] — store extracted document embeddings for retrieval
## Open Questions

- What input types or combinations produce unexpectedly poor results?
- How does quality degrade at the edges of the training distribution?
