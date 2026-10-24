import multer from 'multer';
import { AppError } from '../utils/errors.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype !== 'application/pdf' || !file.originalname.toLowerCase().endsWith('.pdf')) {
      callback(new AppError('INVALID_FILE_TYPE', 'Upload a PDF file.', 400));
      return;
    }
    callback(null, true);
  }
});

export const uploadPaperFile = upload.single('file');
