const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  HeadingLevel,
  LevelFormat,
  BorderStyle,
  WidthType,
  ShadingType,
  VerticalAlign,
} = require('docx');

const OUTPUT_DIR = path.join(process.cwd(), 'outputs');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'document-privacy-architecture.docx');
const CONTENT_W = 9360;

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { before: opts.before ?? 60, after: opts.after ?? 100 },
    alignment: opts.alignment,
    children: [new TextRun({ text, size: opts.size ?? 22, bold: opts.bold ?? false, italics: opts.italics ?? false, color: opts.color, font: opts.font ?? 'Arial' })],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, size: 36, font: 'Arial', color: '1F3864' })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, size: 28, font: 'Arial', color: '2E5FA3' })],
  });
}

function bullets(items) {
  return items.map((text) => new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 22, font: 'Arial' })],
  }));
}

function numbered(items) {
  return items.map((text) => new Paragraph({
    numbering: { reference: 'numbers', level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 22, font: 'Arial' })],
  }));
}

function table(headers, rows, headerFill = '1F3864') {
  const colW = Math.floor(CONTENT_W / headers.length);
  const colWidths = headers.map((_, index) => (index === headers.length - 1 ? CONTENT_W - colW * (headers.length - 1) : colW));
  const border = { style: BorderStyle.SINGLE, size: 4, color: 'B0C4DE' };
  const borders = { top: border, bottom: border, left: border, right: border };

  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((text, index) => new TableCell({
          borders,
          width: { size: colWidths[index], type: WidthType.DXA },
          shading: { fill: headerFill, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20, font: 'Arial', color: 'FFFFFF' })] })],
        })),
      }),
      ...rows.map((row, rowIndex) => new TableRow({
        children: row.map((cell, index) => new TableCell({
          borders,
          width: { size: colWidths[index], type: WidthType.DXA },
          shading: { fill: rowIndex % 2 === 0 ? 'F0F5FB' : 'FFFFFF', type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: cell, size: 20, font: 'Arial' })] })],
        })),
      })),
    ],
  });
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      },
      {
        reference: 'numbers',
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      },
    ],
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: [
        ...Array.from({ length: 4 }, () => p('')),
        p('SECURE PER-USER DOCUMENT PRIVACY', { alignment: AlignmentType.CENTER, size: 60, bold: true, color: '1F3864', after: 200 }),
        p('Real Estate Investment Portal', { alignment: AlignmentType.CENTER, size: 38, color: '2E5FA3', after: 140 }),
        p('Architecture & implementation guide for user-owned documents, KYC files, and proof-of-transfer workflows.', { alignment: AlignmentType.CENTER, size: 24, italics: true, color: '555555', after: 320 }),
        p(`Generated ${new Date().toLocaleDateString('en-GB')}`, { alignment: AlignmentType.CENTER, size: 18, color: '888888', after: 320 }),
        h1('1. Purpose and Context'),
        p('This document defines a secure design for storing, serving, and controlling access to sensitive user documents in the portal. The implementation assumes React/Vite on the frontend, Express on the backend, and Supabase for Auth, Postgres, and Storage.'),
        p('Core rule: each user can only see their own documents. Admins can access any document. Access must be enforced by the backend, the database, and the storage layer.'),

        h2('1.1 Core identifiers'),
        table(
          ['Identifier', 'Table', 'Meaning', 'Example documents'],
          [
            ['user_id', 'users', 'Authenticated user who owns the document', 'KYC, bank statements'],
            ['property_id', 'properties', 'A specific real estate asset', 'Title deed, inspection report'],
            ['investment_id', 'investments', 'A user investment record', 'Subscription agreement'],
            ['transaction_id', 'transactions', 'A financial transaction', 'Proof of transfer, receipt'],
          ]
        ),

        h2('1.2 Security requirements'),
        ...bullets([
          'A user must only see and download their own files.',
          'Admins must be able to upload and download on behalf of users.',
          'Document URLs must not be public or guessable.',
          'The Supabase service role key must never reach the browser.',
          'Every file access should be logged for compliance.',
        ]),

        h1('2. Recommended architecture'),
        p('Use a private Supabase bucket for documents, a metadata table for ownership, and Express as the only component allowed to generate signed URLs and perform privileged storage operations.'),
        table(
          ['Layer', 'Role', 'Security responsibility'],
          [
            ['Frontend', 'React/Vite portal', 'Collect files and display metadata only'],
            ['Backend', 'Express API', 'Verify JWT, enforce ownership, generate signed URLs'],
            ['Database', 'Supabase Postgres + RLS', 'Prevent direct reads of another user\'s document rows'],
            ['Storage', 'Private bucket', 'Store files under user-scoped paths'],
          ]
        ),

        h1('3. Database model'),
        p('Add a document_files table for ownership and metadata, plus a document_access_log table for audit trails.'),
        table(
          ['Table', 'Purpose', 'Key fields'],
          [
            ['document_files', 'Main document registry', 'id, owner_user_id, property_id, investment_id, transaction_id, doc_type, storage_path, status'],
            ['document_access_log', 'Audit trail', 'id, document_id, accessed_by, action, ip_address, accessed_at'],
          ]
        ),

        h1('4. Access control'),
        ...numbered([
          'Verify the user JWT in the backend for every document request.',
          'Look up the document row and compare owner_user_id with the authenticated user id.',
          'Allow access if the requestor is the owner or an admin.',
          'Generate a short-lived signed URL instead of returning a permanent public link.',
          'Log upload, view, and download events for compliance.',
        ]),

        h1('5. Upload and download flow'),
        table(
          ['Action', 'Backend check', 'Storage result'],
          [
            ['User upload', 'JWT verified, file validated, owner set from token', 'File stored in documents/{user_id}/...'],
            ['Admin upload', 'JWT verified, role=admin, target user validated', 'File stored under the target user\'s path'],
            ['User download', 'Ownership checked, signed URL created', '60-second download URL returned'],
            ['Admin download', 'Admin role verified, signed URL created', 'Audit event logged'],
          ]
        ),

        h1('6. Implementation plan'),
        ...numbered([
          'Create a private bucket named documents.',
          'Add document_files and document_access_log tables.',
          'Implement POST /api/documents/upload.',
          'Implement GET /api/documents and GET /api/documents/:id/url.',
          'Add admin-only upload/download paths.',
          'Add retention and deletion policies for expired records.',
        ]),

        h1('7. Risks to avoid'),
        ...bullets([
          'Never trust user_id from the request body for ownership.',
          'Do not expose the Supabase service role key to the frontend.',
          'Do not use public buckets for KYC files.',
          'Do not rely on path structure alone for security.',
          'Keep signed URLs short-lived.',
        ]),
      ],
    },
  ],
});

Packer.toBuffer(doc)
  .then((buffer) => {
    fs.writeFileSync(OUTPUT_FILE, buffer);
    console.log(`Wrote ${OUTPUT_FILE}`);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });