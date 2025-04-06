import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'

// Regex kiểm tra mã màu HEX (ví dụ: #RRGGBB hoặc #RGB)
const HEX_COLOR_RULE = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
const HEX_COLOR_RULE_MESSAGE = 'Color must be a valid HEX color code (e.g., #RRGGBB or #RGB)'

const createNewLabel = async (req, res, next) => {
  // Mặc định không cần gửi ID lên
  const correctCondition = Joi.object({
    boardId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    title: Joi.string().required().min(1).max(50).trim().strict(),
    color: Joi.string().required().pattern(HEX_COLOR_RULE).message(HEX_COLOR_RULE_MESSAGE).trim().strict()
  })

  try {
    // Chỉ định abortEarly: false để trường hợp có nhiều lỗi validation thì trả về tất cả lỗi (video 52)
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    // Validation dữ liệu hợp lệ thì cho request đi tiếp sang Controller
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

const updateLabel = async (req, res, next) => {
  // Lưu ý: Không dùng hàm required() trong trường hợp Update
  // Optional chaining ?. dùng trong trường hợp không có body gửi lên thì không bị lỗi
  const correctCondition = Joi.object({
    // boardId không được phép cập nhật
    title: Joi.string().min(1).max(50).trim().strict(),
    color: Joi.string().pattern(HEX_COLOR_RULE).message(HEX_COLOR_RULE_MESSAGE).trim().strict()
  })

  try {
    // Chỉ định abortEarly: false để trường hợp có nhiều lỗi validation thì trả về tất cả lỗi (video 52)
    // Cho phép unknown để không cần đẩy một số field lên B.E (vd: boardId không cần update)
    await correctCondition.validateAsync(req.body, {
      abortEarly: false,
      allowUnknown: true // Cho phép các trường không được định nghĩa trong schema
    })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

export const labelValidation = {
  createNewLabel,
  updateLabel
} 