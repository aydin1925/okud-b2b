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

// Magic-byte (sihirli imza) doğrulaması.
// fileFilter yalnızca istemcinin gönderdiği Content-Type'a bakar — bu sahtelenebilir
// (ör. .exe'yi "image/png" diye yollamak). Burada dosyanın GERÇEK ilk baytlarına bakıp
// içeriğin gerçekten izin verilen bir tür olduğunu doğrularız.
const MAGIC = {
  'image/jpeg':      (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png':       (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  'application/pdf': (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46, // %PDF
  // WEBP: "RIFF"...."WEBP"
  'image/webp':      (b) =>
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
};

function sniffType(buf) {
  for (const [type, test] of Object.entries(MAGIC)) {
    try { if (test(buf)) return type; } catch (_) { /* kısa buffer */ }
  }
  return null;
}

// documentUpload.single(...) SONRASINDA çalışır. req.file diske yazılmıştır;
// ilk 12 baytı okuyup imzayı doğrular, uymuyorsa dosyayı siler ve hata döner.
function verifyUploadedFile(req, res, next) {
  if (!req.file) return next(); // dosya yoksa (opsiyonel yükleme) devam
  let fd;
  try {
    const buf = Buffer.alloc(12);
    fd = fs.openSync(req.file.path, 'r');
    fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd); fd = null;

    const real = sniffType(buf);
    if (!real || !ALLOWED_MIME_TYPES.includes(real)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).send(
        `Dosya içeriği geçersiz. Sadece gerçek JPG, PNG, WEBP veya PDF kabul edilir. ` +
        `<a href="${req.get('Referer') || '/'}">Geri dön</a>`
      );
    }
    next();
  } catch (err) {
    if (fd) { try { fs.closeSync(fd); } catch (_) {} }
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).send('Dosya doğrulanamadı. Lütfen tekrar deneyin.');
  }
}

module.exports = {
  documentUpload,
  verifyUploadedFile,
  DOCUMENTS_DIR,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
};
