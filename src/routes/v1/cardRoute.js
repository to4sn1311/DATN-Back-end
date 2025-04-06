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
// Router.put('/update-attachment/:id', authMiddleware.isAuthorized, (req, res, next) => {
//   multerUploadMiddleware.uploadAttachment.single('attachmentFile')(req, res, next)
// }, cardController.update)

// Middleware xử lý upload nhiều file đính kèm cùng lúc
// Router.put('/upload-attachments/:id', authMiddleware.isAuthorized, (req, res, next) => {
//   multerUploadMiddleware.uploadAttachment.array('attachmentFiles', 5)(req, res, next)
// }, cardController.uploadMultipleAttachments)

// *** ROUTE MỚI ĐỂ THÊM ATTACHMENTS (1 hoặc nhiều) ***
Router.post('/:id/attachments', 
  authMiddleware.isAuthorized, 
  (req, res, next) => {
    // Sử dụng middleware uploadAttachment nhưng với phương thức array và tên field mới
    multerUploadMiddleware.uploadAttachment.array('attachments', 5)(req, res, next) // Field name là 'attachments'
  }, 
  cardController.addAttachments // Gọi controller mới
)

// Routes cho tính năng archive
Router.put('/:id/archive', authMiddleware.isAuthorized, cardController.archiveCard)
Router.put('/:id/unarchive', authMiddleware.isAuthorized, cardController.unarchiveCard)
Router.get('/archived/:boardId', authMiddleware.isAuthorized, cardController.getArchivedCards)

Router.route('/')
  .post(authMiddleware.isAuthorized, cardValidation.createNew, cardController.createNew)

Router.route('/:id/restore')
  .put(
    authMiddleware.isAuthorized,
    cardValidation.restore,
    cardController.restore
  )

Router.route('/:id')
  .get(cardController.getDetails)
  .put(
    authMiddleware.isAuthorized,
    multerUploadMiddleware.upload.single('cardCover'),
    cardValidation.update,
    cardController.update
  )
  .delete(authMiddleware.isAuthorized, cardController.deleteCard)

// Archive & Restore
Router.route('/:id/archive')
  .put(authMiddleware.isAuthorized, cardController.archiveCard)
Router.route('/:id/unarchive')
  .put(authMiddleware.isAuthorized, cardController.unarchiveCard)

// Permanent Delete (Board Owner only)
Router.route('/:id/permanent')
  .delete(authMiddleware.isAuthorized, cardController.permanentDeleteCard)

// Thêm các route cho label
Router.route('/:cardId/labels')
  .post(authMiddleware.isAuthorized, cardValidation.validateLabelAction, cardController.addLabelToCard)

Router.route('/:cardId/labels/:labelId')
  .delete(authMiddleware.isAuthorized, cardController.removeLabelFromCard)

// Quản lý thành viên của Card
Router.route('/:cardId/members')

export const cardRoute = Router
