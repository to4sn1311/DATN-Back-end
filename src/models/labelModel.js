import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'

// Define Collection (name & schema)
const LABEL_COLLECTION_NAME = 'labels'
const LABEL_COLLECTION_SCHEMA = Joi.object({
  boardId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  title: Joi.string().required().min(1).max(50).trim().strict(),
  color: Joi.string().required().trim().strict(), // Sẽ validate màu sắc cụ thể hơn ở tầng validation nếu cần

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

// Chỉ định các trường không cho phép cập nhật
const INVALID_UPDATE_FIELDS = ['_id', 'boardId', 'createdAt']

const validateBeforeCreate = async (data) => {
  return await LABEL_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    // Chuẩn hóa boardId thành ObjectId
    const newLabelToAdd = {
      ...validData,
      boardId: new ObjectId(validData.boardId)
    }
    const createdLabel = await GET_DB().collection(LABEL_COLLECTION_NAME).insertOne(newLabelToAdd)
    return createdLabel
  } catch (error) { throw new Error(error) }
}

const findOneById = async (id) => {
  try {
    const result = await GET_DB().collection(LABEL_COLLECTION_NAME).findOne({
      _id: new ObjectId(id)
    })
    return result
  } catch (error) { throw new Error(error) }
}

// Lấy tất cả labels thuộc về một board
const findByBoardId = async (boardId) => {
   try {
    const result = await GET_DB().collection(LABEL_COLLECTION_NAME).find({
      boardId: new ObjectId(boardId),
      _destroy: false // Chỉ lấy những label chưa bị xóa mềm
    }).toArray()
    return result
  } catch (error) { throw new Error(error) }
}

const update = async (labelId, updateData) => {
  try {
    Object.keys(updateData).forEach(fieldName => {
      if (INVALID_UPDATE_FIELDS.includes(fieldName)) {
        delete updateData[fieldName]
      }
    })

    // Validate dữ liệu cập nhật nếu cần (ví dụ: title, color không được rỗng)
    // if (updateData.title) updateData.title = updateData.title.trim()
    // if (updateData.color) updateData.color = updateData.color.trim()
    // ... thêm validation cho các trường cần thiết

    const result = await GET_DB().collection(LABEL_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(labelId) },
      { $set: { ...updateData, updatedAt: Date.now() } },
      { returnDocument: 'after' } // Trả về document đã update
    )
    return result
  } catch (error) { throw new Error(error) }
}

// Xóa mềm label
const deleteOneById = async (labelId) => {
  try {
    const result = await GET_DB().collection(LABEL_COLLECTION_NAME).updateOne(
      { _id: new ObjectId(labelId) },
      { $set: { _destroy: true, updatedAt: Date.now() } }
    )
    return result
  } catch (error) { throw new Error(error) }
}


export const labelModel = {
  LABEL_COLLECTION_NAME,
  LABEL_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  findByBoardId,
  update,
  deleteOneById
} 