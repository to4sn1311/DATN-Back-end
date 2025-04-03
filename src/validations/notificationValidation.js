/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */
import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

const createNew = async (req, res, next) => {
  const correctCondition = Joi.object({
    type: Joi.string().valid('invitation', 'assignment', 'comment', 'deadline', 'update').required(),
    title: Joi.string().required(),
    message: Joi.string().required(),
    
    // Thông tin sender (người gửi thông báo) - optional
    sender: Joi.object({
      _id: Joi.string(),
      name: Joi.string()
    }),
    
    // Thông tin về mục tiêu của thông báo (card, board, etc.) - optional
    targetId: Joi.string(),
    targetName: Joi.string(),
    url: Joi.string(),
    
    // Dữ liệu bổ sung - optional
    metadata: Joi.object()
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

export const notificationValidation = {
  createNew
} 