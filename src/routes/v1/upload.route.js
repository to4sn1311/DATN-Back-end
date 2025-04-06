import express from 'express'
import { upload, multerErrorHandler } from '../../middlewares/uploadMiddleware.js'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import s3Client from '../../config/aws.config.js'
import { StatusCodes } from 'http-status-codes'
import { authMiddleware } from '../../middlewares/authMiddleware.js'

const router = express.Router()

// Upload single file
router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return multerErrorHandler(err, req, res, next)
    }

    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        errors: 'No file uploaded'
      })
    }

    res.status(StatusCodes.CREATED).json({
      message: 'File uploaded successfully',
      file: {
        location: req.file.location,
        key: req.file.key,
        mimetype: req.file.mimetype,
        size: req.file.size,
        originalName: req.file.originalname
      }
    })
  })
})

// Upload multiple files
router.post('/upload-multiple', authMiddleware.isAuthorized, (req, res, next) => {
  upload.array('files', 5)(req, res, async (err) => {
    if (err) {
      return multerErrorHandler(err, req, res, next)
    }

    if (!req.files || req.files.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        errors: 'No files uploaded'
      })
    }

    try {
      const uploadedFiles = req.files.map(file => ({
        location: file.location,
        key: file.key,
        mimetype: file.mimetype,
        size: file.size,
        originalName: file.originalname
      }))

      res.status(StatusCodes.CREATED).json({
        message: 'Files uploaded successfully',
        files: uploadedFiles
      })
    } catch (error) {
      next(error)
    }
  })
})

// Get signed URL for temporary access
router.get('/file/:key', async (req, res) => {
  try {
    const { key } = req.params
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key
    })
    
    // URL có hiệu lực trong 1 giờ
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
    
    res.status(StatusCodes.OK).json({ signedUrl })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      errors: error.message
    })
  }
})

export const uploadRoute = router 