import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directories exist
const uploadDir = 'public/uploads';
const contractDir = path.join(uploadDir, 'contracts');
const imageDir = path.join(uploadDir, 'images');
const proofDir = path.join(uploadDir, 'proofs');

[uploadDir, contractDir, imageDir, proofDir].forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    console.warn(`Warning: Could not create directory ${dir}: ${err.message}`);
  }
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let dest = uploadDir;
    if (file.fieldname === 'contract') dest = contractDir;
    else if (file.fieldname === 'image') dest = imageDir;
    else if (file.fieldname === 'proof') dest = proofDir;
    
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    // timestamp_orderId_filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'contract') {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Contract must be a PDF file'), false);
  } else if (file.fieldname === 'image' || file.fieldname === 'proof') {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('File must be an image'), false);
  } else {
    cb(new Error('Unexpected field'), false);
  }
};

export const upload = multer({ 
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB global limit (contract checked separately)
  fileFilter: fileFilter
});
