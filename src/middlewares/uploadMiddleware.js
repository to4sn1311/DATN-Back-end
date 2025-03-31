import multer from 'multer'
import multerS3 from 'multer-s3'
import s3Client from '../config/aws.config.js'
import { StatusCodes } from 'http-status-codes'

// Xử lý lỗi từ multer
export const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        errors: 'File too large. Max size is 5MB'
      })
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        errors: 'Too many files. Max is 5 files'
      })
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        errors: 'Invalid field name for file upload'
      })
    }
  }
  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    errors: err.message
  })
}

const fileFilter = (req, file, cb) => {
  // Kiểm tra loại file được phép
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/mp4'
  ]
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Invalid file type'), false)
  }
}

const s3Storage = multerS3({
  s3: s3Client,
  bucket: process.env.AWS_S3_BUCKET_NAME,
  metadata: (req, file, cb) => {
    cb(null, { fieldName: file.fieldname })
  },
  key: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, `${uniqueSuffix}-${file.originalname}`)
  }
})

export const upload = multer({
  storage: s3Storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5
  },
  fileFilter: fileFilter
}) 