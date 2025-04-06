/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */
import { notificationModel } from '~/models/notificationModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { cloneDeep } from 'lodash'

const createNew = async (data) => {
  try {
    const result = await notificationModel.createNew(data)
    
    // Tìm notification vừa tạo và trả về cho client
    const getNewNotification = await notificationModel.findOneById(result.insertedId.toString())
    
    return getNewNotification
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message)
  }
}

const getNotificationsByUserId = async (userId) => {
  try {
    const notifications = await notificationModel.findByUserId(userId)
    return { notifications }
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message)
  }
}

const markAsRead = async (userId, notificationId) => {
  try {
    // Kiểm tra notification có tồn tại không
    const existingNotification = await notificationModel.findOneById(notificationId)
    if (!existingNotification) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found')
    }
    
    // Kiểm tra notification có thuộc về user không
    if (existingNotification.userId !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to update this notification')
    }
    
    // Đánh dấu đã đọc
    const updatedNotification = await notificationModel.markAsRead(notificationId)
    return updatedNotification
  } catch (error) {
    throw new ApiError(
      error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
      error.message
    )
  }
}

const markAllAsRead = async (userId) => {
  try {
    await notificationModel.markAllAsRead(userId)
    
    // Lấy danh sách thông báo sau khi đã đánh dấu đọc tất cả
    const notifications = await notificationModel.findByUserId(userId)
    return { notifications }
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message)
  }
}

const deleteNotification = async (userId, notificationId) => {
  try {
    // Kiểm tra notification có tồn tại không
    const existingNotification = await notificationModel.findOneById(notificationId)
    if (!existingNotification) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found')
    }
    
    // Kiểm tra notification có thuộc về user không
    if (existingNotification.userId !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to delete this notification')
    }
    
    // Xóa notification
    await notificationModel.remove(notificationId)
    return { message: 'Notification deleted successfully' }
  } catch (error) {
    throw new ApiError(
      error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
      error.message
    )
  }
}

export const notificationService = {
  createNew,
  getNotificationsByUserId,
  markAsRead,
  markAllAsRead,
  deleteNotification
} 