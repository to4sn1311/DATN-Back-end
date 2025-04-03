/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */
import express from 'express'
import { notificationValidation } from '~/validations/notificationValidation'
import { notificationController } from '~/controllers/notificationController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// Tạo notification mới
Router.route('/')
  .post(
    authMiddleware.isAuthorized,
    notificationValidation.createNew,
    notificationController.createNew
  )
  .get(
    authMiddleware.isAuthorized,
    notificationController.getNotifications
  )

// Đánh dấu notification đã đọc
Router.route('/:id/read')
  .patch(
    authMiddleware.isAuthorized,
    notificationController.markAsRead
  )

// Đánh dấu tất cả notification đã đọc
Router.route('/read-all')
  .patch(
    authMiddleware.isAuthorized,
    notificationController.markAllAsRead
  )

// Xóa notification
Router.route('/:id')
  .delete(
    authMiddleware.isAuthorized,
    notificationController.deleteNotification
  )

export const notificationRoute = Router 