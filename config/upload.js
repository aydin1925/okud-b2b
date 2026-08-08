const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const DOCUMENTS_DIR = path.join(UPLOAD_ROOT, 'documents');

fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, DOCUMENTS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const random = crypto.randomBytes(16).toString('hex');
    cb(null, `${Date.now()}_${random}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Sadece JPG, PNG, WEBP veya PDF kabul edilir'), false);
  }
}

const documentUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

module.exports = {
  documentUpload,
  DOCUMENTS_DIR,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
};
