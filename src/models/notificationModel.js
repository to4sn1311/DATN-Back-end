/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */
import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

// Define Collection (name & schema)
const NOTIFICATION_COLLECTION_NAME = 'notifications'
const NOTIFICATION_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required(), // ID của người nhận thông báo
  type: Joi.string().valid('invitation', 'assignment', 'comment', 'deadline', 'update').required(), // Loại thông báo

  // Thông tin cơ bản
  title: Joi.string().required(),
  message: Joi.string().required(),
  read: Joi.boolean().default(false),
  
  // Thông tin sender (người gửi thông báo)
  sender: Joi.object({
    _id: Joi.string(),
    name: Joi.string()
  }),
  
  // Thông tin về mục tiêu của thông báo (card, board, etc.)
  targetId: Joi.string(),
  targetName: Joi.string(),
  url: Joi.string(),
  
  // Dữ liệu bổ sung
  metadata: Joi.object().optional(),
  
  // Timestamps
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null)
})

// Validate function
const validateSchema = async (data) => {
  return await NOTIFICATION_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  try {
    const validData = await validateSchema(data)
    const createdNotification = await GET_DB().collection(NOTIFICATION_COLLECTION_NAME).insertOne({
      ...validData,
      _id: new ObjectId()
    })
    
    // Return the newly created notification with its _id
    return createdNotification
  } catch (error) { throw new Error(error) }
}

const findOneById = async (id) => {
  try {
    const result = await GET_DB().collection(NOTIFICATION_COLLECTION_NAME).findOne({
      _id: new ObjectId(id)
    })
    return result
  } catch (error) { throw new Error(error) }
}

const findByUserId = async (userId) => {
  try {
    const result = await GET_DB().collection(NOTIFICATION_COLLECTION_NAME)
      .find({ userId: userId })
      .sort({ createdAt: -1 }) // Sort by createdAt in descending order (newest first)
      .toArray()
    return result
  } catch (error) { throw new Error(error) }
}

const markAsRead = async (id) => {
  try {
    const result = await GET_DB().collection(NOTIFICATION_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { read: true, updatedAt: Date.now() } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error) }
}

const markAllAsRead = async (userId) => {
  try {
    const result = await GET_DB().collection(NOTIFICATION_COLLECTION_NAME).updateMany(
      { userId: userId, read: false },
      { $set: { read: true, updatedAt: Date.now() } }
    )
    return result
  } catch (error) { throw new Error(error) }
}

const remove = async (id) => {
  try {
    const result = await GET_DB().collection(NOTIFICATION_COLLECTION_NAME).deleteOne({
      _id: new ObjectId(id)
    })
    return result
  } catch (error) { throw new Error(error) }
}

export const notificationModel = {
  NOTIFICATION_COLLECTION_NAME,
  NOTIFICATION_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  findByUserId,
  markAsRead,
  markAllAsRead,
  remove
} 