/**
 * Updated by trungquandev.com's author on Oct 8 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */

import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE, EMAIL_RULE, EMAIL_RULE_MESSAGE } from '~/utils/validators'
import { CARD_MEMBER_ACTIONS } from '~/utils/constants'

// Define Collection (name & schema)
const CARD_COLLECTION_NAME = 'cards'
const CARD_COLLECTION_SCHEMA = Joi.object({
  boardId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  columnId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),

  title: Joi.string().required().min(3).max(255).trim().strict(),
  description: Joi.string().optional(),

  cover: Joi.string().default(null),
  isCompleted: Joi.boolean().default(false),
  startDate: Joi.date().allow(null).default(null),
  dueDate: Joi.date().allow(null).default(null),

  // Thêm trường labelIds
  labelIds: Joi.array().items(
    Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  ).default([]),

  // Thêm trường archive
  archived: Joi.boolean().default(false),
  archivedAt: Joi.date().when('archived', {
    is: true,
    then: Joi.date().required(),
    otherwise: Joi.allow(null)
  }).default(null),
  archivedBy: Joi.string().when('archived', {
    is: true,
    then: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    otherwise: Joi.allow(null)
  }).default(null),

  memberIds: Joi.array().items(
    Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  ).default([]),
  // Thêm trường attachments để lưu thông tin về các tệp đính kèm
  attachments: Joi.array().items({
    fileName: Joi.string().required(),
    fileUrl: Joi.string().required(),
    fileType: Joi.string().required(),
    fileSize: Joi.number().required(),
    uploadedAt: Joi.date().timestamp().default(Date.now),
    uploadedBy: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  }).default([]),
  // Dữ liệu comments của Card chúng ta sẽ học cách nhúng - embedded vào bản ghi Card luôn như dưới đây:
  comments: Joi.array().items({
    userId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    userEmail: Joi.string().pattern(EMAIL_RULE).message(EMAIL_RULE_MESSAGE),
    userAvatar: Joi.string(),
    userDisplayName: Joi.string(),
    content: Joi.string(),
    // Chỗ này lưu ý vì dùng hàm $push để thêm comment nên không set default Date.now luôn giống hàm insertOne khi create được.
    commentedAt: Joi.date().timestamp()
  }).default([]),

  // Thêm trường activities để theo dõi các hoạt động quan trọng của card
  activities: Joi.array().items({
    userId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    userAvatar: Joi.string(),
    userDisplayName: Joi.string(),
    action: Joi.string().required(),
    content: Joi.string(),
    activityAt: Joi.date().timestamp()
  }).default([]),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

// Chỉ định ra những Fields mà chúng ta không muốn cho phép cập nhật trong hàm update()
const INVALID_UPDATE_FIELDS = ['_id', 'boardId', 'createdAt']

const validateBeforeCreate = async (data) => {
  return await CARD_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    // Biến đổi một số dữ liệu liên quan tới ObjectId chuẩn chỉnh
    const newCardToAdd = {
      ...validData,
      boardId: new ObjectId(validData.boardId),
      columnId: new ObjectId(validData.columnId)
    }

    const createdCard = await GET_DB().collection(CARD_COLLECTION_NAME).insertOne(newCardToAdd)
    return createdCard
  } catch (error) { throw new Error(error) }
}

const findOneById = async (cardId) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOne({ _id: new ObjectId(cardId) })
    return result
  } catch (error) { throw new Error(error) }
}

const update = async (cardId, updateData) => {
  try {
    // Lọc những field mà chúng ta không cho phép cập nhật linh tinh
    Object.keys(updateData).forEach(fieldName => {
      if (INVALID_UPDATE_FIELDS.includes(fieldName)) {
        delete updateData[fieldName]
      }
    })

    // Đối với những dữ liệu liên quan ObjectId, biến đổi ở đây
    if (updateData.columnId) updateData.columnId = new ObjectId(updateData.columnId)
    if (updateData.archivedBy) updateData.archivedBy = new ObjectId(updateData.archivedBy)

    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      { $set: updateData },
      { returnDocument: 'after' } // sẽ trả về kết quả mới sau khi cập nhật
    )
    return result
  } catch (error) { throw new Error(error) }
}

const deleteManyByColumnId = async (columnId) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).deleteMany({ columnId: new ObjectId(columnId) })
    return result
  } catch (error) { throw new Error(error) }
}

/**
  * Đẩy một phần tử comment vào đầu mảng comments!
  * - Trong JS, ngược lại với push (thêm phần tử vào cuối mảng) sẽ là unshift (thêm phần tử vào đầu mảng)
  * - Nhưng trong mongodb hiện tại chỉ có $push - mặc định đẩy phần tử vào cuối mảng.
  * Dĩ nhiên cứ lưu comment mới vào cuối mảng cũng được, nhưng nay sẽ học cách để thêm phần tử vào đẩu mảng trong mongodb.
  * Vẫn dùng $push, nhưng bọc data vào Array để trong $each và chỉ định $position: 0
  * https://stackoverflow.com/a/25732817/8324172
  * https://www.mongodb.com/docs/manual/reference/operator/update/position/
*/
const unshiftNewComment = async (cardId, commentData) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      { $push: { comments: { $each: [commentData], $position: 0 } } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Thêm một hoạt động mới vào đầu mảng activities của card
 */
const unshiftNewActivity = async (cardId, activityData) => {
  try {
    // Đảm bảo userId là ObjectId nếu tồn tại
    if (activityData.userId) {
      activityData.userId = new ObjectId(activityData.userId)
    }
    
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      { $push: { activities: { $each: [activityData], $position: 0 } } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error) }
}

/**
* Hàm này sẽ có nhiệm vụ xử lý cập nhật thêm hoặc xóa member khỏi card dựa theo Action
* sẽ dùng $push để thêm hoặc $pull để loại bỏ ($pull trong mongodb để lấy một phần tử ra khỏi mảng rồi xóa nó đi)
*/
const updateMembers = async (cardId, incomingMemberInfo) => {
  try {
    // Tạo ra một biến updateCondition ban đầu là rỗng
    let updateCondition = {}
    let isAddAction = false

    if (incomingMemberInfo.action === CARD_MEMBER_ACTIONS.ADD) {
      // console.log('Trường hợp Add, dùng $push: ', incomingMemberInfo)
      updateCondition = { $push: { memberIds: new ObjectId(incomingMemberInfo.userId) } }
      isAddAction = true
    }

    if (incomingMemberInfo.action === CARD_MEMBER_ACTIONS.REMOVE) {
      // console.log('Trường hợp Remove, dùng $pull: ', incomingMemberInfo)
      updateCondition = { $pull: { memberIds: new ObjectId(incomingMemberInfo.userId) } }
    }

    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      updateCondition, // truyền cái updateCondition ở đây
      { returnDocument: 'after' }
    )

    // Thêm thông tin của card và hành động vào kết quả trả về 
    // để có thể sử dụng cho việc gửi thông báo
    return {
      ...result,
      actionType: incomingMemberInfo.action,
      isAddAction: isAddAction
    }
  } catch (error) { throw new Error(error) }
}

/**
 * Ví dụ cập nhật nhiều bản ghi Comments, code này dùng để cho các bạn tham khảo thêm trong trường hợp muốn cập nhật thông tin user thì gọi để cập nhật lại thông tin user đó trong card comments, ví dụ avatar và displayName.
 * Updating Arrays https://www.mongodb.com/docs/manual/reference/method/db.collection.updateMany/
 * Example: https://www.mongodb.com/docs/manual/reference/method/db.collection.updateMany/#std-label-updateMany-arrayFilters
 */
const updateManyComments = async (userInfo) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).updateMany(
      { 'comments.userId': new ObjectId(userInfo._id) },
      { $set: {
        'comments.$[element].userAvatar': userInfo.avatar,
        'comments.$[element].userDisplayName': userInfo.displayName
      } },
      { arrayFilters: [{ 'element.userId': new ObjectId(userInfo._id) }] }
    )

    return result
  } catch (error) { throw new Error(error) }
}

const deleteOneById = async (cardId) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).deleteOne({ _id: new ObjectId(cardId) })
    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Đánh dấu một card là đã được lưu trữ
 */
const archiveCard = async (cardId, userId) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      { 
        $set: { 
          archived: true, 
          archivedAt: new Date(), 
          archivedBy: new ObjectId(userId),
          updatedAt: new Date()
        } 
      },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Khôi phục card từ trạng thái lưu trữ
 */
const unarchiveCard = async (cardId) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      { 
        $set: { 
          archived: false,
          updatedAt: new Date()
        },
        $unset: { 
          archivedAt: '',
          archivedBy: '' 
        }
      },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Lấy danh sách các card đã được lưu trữ của một board
 */
const getArchivedCards = async (boardId) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME)
      .find({ 
        boardId: new ObjectId(boardId),
        archived: true,
        _destroy: false
      })
      .toArray()
    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Xóa một attachment khỏi mảng attachments dựa trên fileUrl
 */
const pullAttachment = async (cardId, fileUrlToRemove) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      { $pull: { attachments: { fileUrl: fileUrlToRemove } } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Thêm một attachment vào cuối mảng attachments
 */
const pushAttachment = async (cardId, attachmentData) => {
  try {
    // Đảm bảo uploadedBy là ObjectId nếu tồn tại
    if (attachmentData.uploadedBy) {
      attachmentData.uploadedBy = new ObjectId(attachmentData.uploadedBy)
    }
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      { $push: { attachments: attachmentData } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Thêm nhiều attachment vào cuối mảng attachments
 */
const pushMultipleAttachments = async (cardId, attachmentsDataArray) => {
  try {
    // Đảm bảo uploadedBy là ObjectId cho từng attachment
    const processedAttachments = attachmentsDataArray.map(att => ({
      ...att,
      uploadedBy: att.uploadedBy ? new ObjectId(att.uploadedBy) : null,
      uploadedAt: att.uploadedAt || Date.now() // Đảm bảo có timestamp
    }))
    
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      { $push: { attachments: { $each: processedAttachments } } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error) }
}

// Thêm labelId vào mảng labelIds
const pushLabelId = async (cardId, labelId) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).updateOne(
      { _id: new ObjectId(cardId) },
      { $push: { labelIds: new ObjectId(labelId) } }
    )
    return result
  } catch (error) { throw new Error(error) }
}

// Gỡ labelId khỏi mảng labelIds
const pullLabelId = async (cardId, labelId) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).updateOne(
      { _id: new ObjectId(cardId) },
      { $pull: { labelIds: new ObjectId(labelId) } }
    )
    return result
  } catch (error) { throw new Error(error) }
}

// Gỡ labelId khỏi tất cả các card thuộc một board
const pullLabelFromAllCards = async (boardId, labelId) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).updateMany(
      { 
        boardId: new ObjectId(boardId), // Chỉ tác động đến card trong board cụ thể
        labelIds: new ObjectId(labelId) // Chỉ tác động đến card có chứa labelId này
      },
      { $pull: { labelIds: new ObjectId(labelId) } }
    )
    return result
  } catch (error) { throw new Error(error) }
}

// Lấy tất cả cards thuộc về một board (không bao gồm card đã lưu trữ)
const findActiveByBoardId = async (boardId) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).find({
      boardId: new ObjectId(boardId),
      archived: false // Chỉ lấy card chưa bị lưu trữ
    }).toArray()
    return result
  } catch (error) { throw new Error(error) }
}

export const cardModel = {
  CARD_COLLECTION_NAME,
  CARD_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  findActiveByBoardId,
  update,
  deleteManyByColumnId,
  unshiftNewComment,
  unshiftNewActivity,
  updateMembers,
  updateManyComments,
  deleteOneById,
  archiveCard,
  unarchiveCard,
  getArchivedCards,
  pullAttachment,
  pushAttachment,
  pushMultipleAttachments,
  pushLabelId,
  pullLabelId,
  pullLabelFromAllCards
}
