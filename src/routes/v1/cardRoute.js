/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */
import express from 'express'
import { cardValidation } from '~/validations/cardValidation'
import { cardController } from '~/controllers/cardController'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware'

const Router = express.Router()

// Middleware xử lý upload file card cover
Router.put('/update-cover/:id', authMiddleware.isAuthorized, (req, res, next) => {
  multerUploadMiddleware.upload.single('cardCover')(req, res, next)
}, cardController.update)

// Middleware xử lý upload single file đính kèm
Router.put('/update-attachment/:id', authMiddleware.isAuthorized, (req, res, next) => {
  multerUploadMiddleware.uploadAttachment.single('attachmentFile')(req, res, next)
}, cardController.update)

// Middleware xử lý upload nhiều file đính kèm cùng lúc
Router.put('/upload-attachments/:id', authMiddleware.isAuthorized, (req, res, next) => {
  multerUploadMiddleware.uploadAttachment.array('attachmentFiles', 5)(req, res, next)
}, cardController.uploadMultipleAttachments)

Router.route('/')
  .post(authMiddleware.isAuthorized, cardValidation.createNew, cardController.createNew)

Router.route('/:id/restore')
  .put(
    authMiddleware.isAuthorized,
    cardValidation.restore,
    cardController.restore
  )

Router.route('/:id')
  .put(
    authMiddleware.isAuthorized,
    (req, res, next) => {
      // Sử dụng middleware multer tùy thuộc vào trường hợp
      if (req.headers['content-type']?.includes('multipart/form-data')) {
        // Nếu có file cardCover
        if (req.headers['x-file-type'] === 'cover') {
          multerUploadMiddleware.upload.single('cardCover')(req, res, next)
        } 
        // Nếu có file attachment
        else if (req.headers['x-file-type'] === 'attachment') {
          multerUploadMiddleware.uploadAttachment.single('attachmentFile')(req, res, next)
        }
        else {
          next()
        }
      } else {
        next()
      }
    },
    cardValidation.update,
    cardController.update
  )
  .delete(authMiddleware.isAuthorized, cardController.deleteCard)

export const cardRoute = Router
