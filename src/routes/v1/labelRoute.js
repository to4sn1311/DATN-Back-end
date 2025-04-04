import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { labelValidation } from '~/validations/labelValidation'
import { labelController } from '~/controllers/labelController'

const Router = express.Router()

Router.route('/')
  .post(authMiddleware.isAuthorized, labelValidation.createNewLabel, labelController.createNewLabel)
  // .get(...) // Có thể thêm API lấy labels theo boardId ở đây nếu cần

Router.route('/:labelId')
  .put(authMiddleware.isAuthorized, labelValidation.updateLabel, labelController.updateLabel) // Dùng PUT hoặc PATCH tùy chuẩn RESTful
  .delete(authMiddleware.isAuthorized, labelController.deleteLabel)

export const labelRoute = Router 