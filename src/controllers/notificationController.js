/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */
import { StatusCodes } from 'http-status-codes'
import { notificationService } from '~/services/notificationService'

const createNew = async (req, res, next) => {
  try {
    // Lấy user ID từ token
    const userId = req.jwtDecoded._id
    
    // Tạo thông báo với userId
    const notificationData = {
      ...req.body,
      userId
    }
    
    const result = await notificationService.createNew(notificationData)
    
    res.status(StatusCodes.CREATED).json(result)
  } catch (error) { next(error) }
}

const getNotifications = async (req, res, next) => {
  try {
    // Lấy user ID từ token
    const userId = req.jwtDecoded._id
    
    const result = await notificationService.getNotificationsByUserId(userId)
    
    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

const markAsRead = async (req, res, next) => {
  try {
    // Lấy user ID từ token
    const userId = req.jwtDecoded._id
    const { id } = req.params
    
    const result = await notificationService.markAsRead(userId, id)
    
    res.status(StatusCodes.OK).json({ notification: result })
  } catch (error) { next(error) }
}

const markAllAsRead = async (req, res, next) => {
  try {
    // Lấy user ID từ token
    const userId = req.jwtDecoded._id
    
    const result = await notificationService.markAllAsRead(userId)
    
    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

const deleteNotification = async (req, res, next) => {
  try {
    // Lấy user ID từ token
    const userId = req.jwtDecoded._id
    const { id } = req.params
    
    const result = await notificationService.deleteNotification(userId, id)
    
    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

export const notificationController = {
  createNew,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
} 