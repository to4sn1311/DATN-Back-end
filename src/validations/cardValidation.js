/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */
import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'

const createNew = async (req, res, next) => {
  const correctCondition = Joi.object({
    boardId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    columnId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    title: Joi.string().required().min(3).max(255).trim().strict()
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

const update = async (req, res, next) => {
  // Lưu ý không dùng hàm required() trong trường hợp Update
  const correctCondition = Joi.object({
    title: Joi.string().min(3).max(255).trim().strict(),
    description: Joi.string().optional()
  })

  try {
    // Chỉ định abortEarly: false để trường hợp có nhiều lỗi validation thì trả về tất cả lỗi (video 52)
    // Đối với trường hợp update, cho phép Unknown để không cần đẩy một số field lên
    await correctCondition.validateAsync(req.body, {
      abortEarly: false,
      allowUnknown: true
    })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

const restore = async (req, res, next) => {
  const correctCondition = Joi.object({
    columnId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  })

  try {
    await correctCondition.validateAsync(req.body, {
      abortEarly: false,
      allowUnknown: true
    })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

// Validation khi gắn/gỡ label (chỉ cần kiểm tra labelId trong body hoặc params)
const validateLabelAction = async (req, res, next) => {
  const correctCondition = Joi.object({
    // Đối với POST (gắn label), labelId nằm trong body
    labelId: Joi.string().when('$requestMethod', {
      is: 'POST',
      then: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
      otherwise: Joi.forbidden() // Không cho phép gửi labelId trong body khi DELETE
    })
  })

  try {
    await correctCondition.validateAsync(req.body, {
       abortEarly: false,
       context: { requestMethod: req.method } // Truyền phương thức request vào context
     })
    // Nếu là DELETE, labelId đã được kiểm tra bởi route params, không cần check body
    next()
  } catch (error) {
     // Chỉ bắt lỗi nếu là POST (vì DELETE không validate body này)
     if (req.method === 'POST') {
         next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
     } else {
         next() // Bỏ qua lỗi validation cho các method khác
     }
  }
}

export const cardValidation = {
  createNew,
  update,
  restore,
  validateLabelAction
}
