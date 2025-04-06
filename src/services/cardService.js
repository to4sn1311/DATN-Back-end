import { cardModel } from '~/models/cardModel'
import { columnModel } from '~/models/columnModel'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { S3Provider } from '~/providers/S3Provider'
import { ObjectId } from 'mongodb'
import { userModel } from '~/models/userModel'
import { labelModel } from '~/models/labelModel'
import { CARD_MEMBER_ACTIONS } from '~/utils/constants'

const createNew = async (reqBody) => {
  try {
    // Xử lý logic dữ liệu tùy đặc thù dự án
    const newCard = {
      ...reqBody
    }
    const createdCard = await cardModel.createNew(newCard)
    const getNewCard = await cardModel.findOneById(createdCard.insertedId)

    if (getNewCard) {
      // Cập nhật mảng cardOrderIds trong collection columns
      await columnModel.pushCardOrderIds(getNewCard)
    }

    return getNewCard
  } catch (error) { throw error }
}

const update = async (cardId, reqBody, uploadedFile, userId) => {
  try {
    const updateData = {
      ...reqBody,
      updatedAt: Date.now()
    }
    let updatedCard = {}
    let assigner = null // Biến lưu thông tin người gán

    // Lấy thông tin user hiện tại (người thực hiện hành động) từ DB
    // để có displayName gửi kèm trong notification và activities
    if (userId) {
      assigner = await userModel.findOneById(userId)
    }

    // Hàm helper để tạo và lưu hoạt động vào card
    const trackActivity = async (cardId, action, content) => {
      if (!assigner) return
      
      const activityData = {
        userId: userId,
        userAvatar: assigner.avatar,
        userDisplayName: assigner.displayName || assigner.username,
        action: action,
        content: content,
        activityAt: Date.now()
      }
      
      // Lưu hoạt động vào card
      const result = await cardModel.unshiftNewActivity(cardId, activityData)
      
      // Phát sự kiện socket nếu có global.io
      if (global.io) {
        global.io.emit('BE_CARD_ACTIVITY_UPDATED', {
          cardId: cardId,
          activity: activityData,
          activityType: action
        })
      }
      
      return result
    }

    // Đánh dấu card hoàn thành/chưa hoàn thành
    if (Object.prototype.hasOwnProperty.call(reqBody, 'isCompleted')) {
      const actionType = reqBody.isCompleted ? 'MARK_COMPLETE' : 'MARK_INCOMPLETE'
      const content = reqBody.isCompleted ? 
        `${assigner?.displayName || 'Ai đó'} đã đánh dấu thẻ này là hoàn thành.` : 
        `${assigner?.displayName || 'Ai đó'} đã đánh dấu thẻ này là chưa hoàn thành.`
      
      // Ghi nhận hoạt động
      await trackActivity(cardId, actionType, content)

      // Cập nhật trạng thái card
      updatedCard = await cardModel.update(cardId, { isCompleted: reqBody.isCompleted })
    } else if (reqBody.incomingMemberInfo) {
      updatedCard = await cardModel.updateMembers(cardId, reqBody.incomingMemberInfo)
      
      const isAddAction = reqBody.incomingMemberInfo.action === CARD_MEMBER_ACTIONS.ADD
      const actionType = isAddAction ? 'ADD_MEMBER' : 'REMOVE_MEMBER'
      
      // Lấy thông tin người được thêm/xóa
      let memberName = 'Ai đó'
      try {
        const memberUser = await userModel.findOneById(reqBody.incomingMemberInfo.userId)
        if (memberUser) {
          memberName = memberUser.displayName || memberUser.username
        }
      } catch (error) {
        console.error('Lỗi khi lấy thông tin thành viên:', error)
      }
      
      // Tạo nội dung hoạt động
      const content = isAddAction ?
        `${assigner?.displayName || 'Ai đó'} đã thêm ${memberName} vào thẻ.` : 
        `${assigner?.displayName || 'Ai đó'} đã xóa ${memberName} khỏi thẻ.`
      
      // Ghi nhận hoạt động
      await trackActivity(cardId, actionType, content)
      
      // Không gửi thông báo task assignment nữa
    } else if (reqBody.commentToAdd) {
      const commentData = {
        ...reqBody.commentToAdd,
        userId: new ObjectId(userId),
        userAvatar: assigner?.avatar,
        userDisplayName: assigner?.displayName || assigner?.username,
        commentedAt: Date.now()
      }
      updatedCard = await cardModel.unshiftNewComment(cardId, commentData)
      
      // Ghi nhận hoạt động thêm bình luận
      await trackActivity(
        cardId,
        'ADD_COMMENT',
        `${assigner?.displayName || 'Ai đó'} đã thêm một bình luận vào thẻ này.`
      )
      
      // Không gửi thông báo comment nữa
    } else if (Object.prototype.hasOwnProperty.call(reqBody, 'cover')) {
      if (reqBody.cover === null) {
        // Xóa cover hiện tại
        updatedCard = await cardModel.update(cardId, { cover: null })
        
        // Ghi nhận hoạt động xóa cover
        await trackActivity(
          cardId,
          'REMOVE_COVER',
          `${assigner?.displayName || 'Ai đó'} đã xóa ảnh bìa.`
        )
      } else {
        // Cập nhật ảnh bìa
        updatedCard = await cardModel.update(cardId, { cover: reqBody.cover })
        
        // Ghi nhận hoạt động cập nhật ảnh bìa
        await trackActivity(
          cardId,
          'UPDATE_COVER',
          `${assigner?.displayName || 'Ai đó'} đã cập nhật ảnh bìa.`
        )
      }
    } else if (uploadedFile && uploadedFile.fieldname === 'cardCover') {
      const uploadResult = await CloudinaryProvider.streamUpload(uploadedFile.buffer, 'card-covers')
      updatedCard = await cardModel.update(cardId, {
        cover: uploadResult.secure_url,
        updatedAt: Date.now()
      })
      
      // Ghi nhận hoạt động thêm bìa mới
      await trackActivity(cardId, 'UPDATE_COVER', `${assigner?.displayName || 'Ai đó'} đã cập nhật ảnh bìa cho thẻ.`)
    } else if (uploadedFile && uploadedFile.fieldname === 'attachmentFile') {
      // Xử lý upload file đính kèm đơn lẻ (giữ code hiện tại)
      // ...
      
      // Giữ nguyên phần code xử lý attachment
      const uploadResult = await S3Provider.uploadFile(uploadedFile.buffer, uploadedFile.originalname, 'card-attachment')
      
      const newAttachment = {
        url: uploadResult.url,
        fileName: uploadedFile.originalname,
        mimeType: uploadedFile.mimetype,
        size: uploadedFile.size,
        uploadAt: Date.now(),
        uploadBy: {
          _id: userId,
          displayName: assigner?.displayName || 'Unnamed',
          avatar: assigner?.avatar
        }
      }
      
      updatedCard = await cardModel.pushAttachment(cardId, newAttachment)
      
      // Ghi nhận hoạt động thêm tệp đính kèm
      await trackActivity(
        cardId,
        'ADD_ATTACHMENT',
        `${assigner?.displayName || 'Ai đó'} đã thêm tệp đính kèm ${uploadedFile.originalname}.`
      )
    } else if (Object.prototype.hasOwnProperty.call(reqBody, 'description')) {
      // Cập nhật mô tả
      updatedCard = await cardModel.update(cardId, { description: reqBody.description })
      
      // Ghi nhận hoạt động cập nhật mô tả
      await trackActivity(
        cardId,
        'UPDATE_DESCRIPTION',
        `${assigner?.displayName || 'Ai đó'} đã cập nhật mô tả thẻ.`
      )
    } else if (Object.prototype.hasOwnProperty.call(reqBody, 'title')) {
      // Cập nhật tiêu đề
      updatedCard = await cardModel.update(cardId, { title: reqBody.title })
      
      // Ghi nhận hoạt động cập nhật tiêu đề
      await trackActivity(
        cardId,
        'UPDATE_TITLE',
        `${assigner?.displayName || 'Ai đó'} đã cập nhật tiêu đề thành "${reqBody.title}".`
      )
    } else if (Object.prototype.hasOwnProperty.call(reqBody, 'attachmentIdToRemove')) {
      // Xóa attachment
      const fileUrlToRemove = reqBody.attachmentIdToRemove
      updatedCard = await cardModel.pullAttachment(cardId, fileUrlToRemove)
      
      // Ghi nhận hoạt động xóa tệp đính kèm
      await trackActivity(
        cardId,
        'REMOVE_ATTACHMENT',
        `${assigner?.displayName || 'Ai đó'} đã xóa một tệp đính kèm.`
      )
    } else if (Object.prototype.hasOwnProperty.call(reqBody, 'startDate')) {
      // Cập nhật ngày bắt đầu
      updatedCard = await cardModel.update(cardId, { startDate: reqBody.startDate })
      
      // Ghi nhận hoạt động cập nhật ngày bắt đầu
      await trackActivity(
        cardId,
        'UPDATE_START_DATE',
        `${assigner?.displayName || 'Ai đó'} đã ${reqBody.startDate ? 'cập nhật' : 'xóa'} ngày bắt đầu.`
      )
    } else if (Object.prototype.hasOwnProperty.call(reqBody, 'dueDate')) {
      // Cập nhật ngày hết hạn
      updatedCard = await cardModel.update(cardId, { dueDate: reqBody.dueDate })
      
      // Ghi nhận hoạt động cập nhật ngày hết hạn
      await trackActivity(
        cardId,
        'UPDATE_DUE_DATE',
        `${assigner?.displayName || 'Ai đó'} đã ${reqBody.dueDate ? 'cập nhật' : 'xóa'} ngày hết hạn.`
      )
    } else if (reqBody.labelIdToAdd) {
      // Thêm nhãn vào card
      updatedCard = await cardModel.pushLabelId(cardId, reqBody.labelIdToAdd)
      
      try {
        // Lấy thông tin nhãn
        const label = await labelModel.findOneById(reqBody.labelIdToAdd)
        
        if (label) {
          // Ghi nhận hoạt động thêm nhãn
          await trackActivity(
            cardId,
            'ADD_LABEL', 
            `${assigner?.displayName || 'Ai đó'} đã thêm nhãn "${label.name}" vào thẻ.`
          )
        }
      } catch (error) {
        console.error('Lỗi khi ghi nhận hoạt động thêm nhãn:', error)
      }
    } else if (reqBody.labelIdToRemove) {
      // Xóa nhãn khỏi card
      try {
        // Lấy thông tin nhãn trước khi xóa
        const label = await labelModel.findOneById(reqBody.labelIdToRemove)
        
        // Xóa nhãn
        updatedCard = await cardModel.pullLabelId(cardId, reqBody.labelIdToRemove)
        
        if (label) {
          // Ghi nhận hoạt động xóa nhãn
          await trackActivity(
            cardId,
            'REMOVE_LABEL', 
            `${assigner?.displayName || 'Ai đó'} đã xóa nhãn "${label.name}" khỏi thẻ.`
          )
        }
      } catch (error) {
        console.error('Lỗi khi ghi nhận hoạt động xóa nhãn:', error)
      }
    } else {
      const { attachmentIdToRemove, ...restUpdateData } = updateData // userId không còn trong updateData
      if (Object.keys(restUpdateData).length > 0) { 
           updatedCard = await cardModel.update(cardId, restUpdateData)
      } else {
           updatedCard = await cardModel.findOneById(cardId)
      }
    }

    return updatedCard
  } catch (error) { throw error }
}

const deleteCard = async (cardId) => {
  try {
    const targetCard = await cardModel.findOneById(cardId)
    if (!targetCard) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Card not found!')
    }

    // Thay vì xóa hẳn card, chúng ta sẽ đánh dấu nó là đã lưu trữ
    await cardModel.update(cardId, { isArchived: true })

    // Xóa cardId khỏi mảng cardOrderIds trong column chứa nó
    await columnModel.pullCardOrderIds(targetCard)

    return { deleteResult: 'Card archived successfully!' }
  } catch (error) { throw error }
}

/**
 * Đánh dấu card là đã được lưu trữ (archive)
 */
const archiveCard = async (cardId, userId) => {
  try {
    // Lấy thông tin user hiện tại (người thực hiện hành động)
    const user = await userModel.findOneById(userId)
    
    // Đánh dấu card là đã lưu trữ
    const archivedCard = await cardModel.archiveCard(cardId, userId)
    
    // Ghi nhận hoạt động lưu trữ vào activities
    if (user) {
      const activityData = {
        userId: userId,
        userAvatar: user.avatar,
        userDisplayName: user.displayName || user.username,
        action: 'ARCHIVE',
        content: `${user.displayName || 'Ai đó'} đã lưu trữ thẻ này.`,
        activityAt: Date.now()
      }
      
      await cardModel.unshiftNewActivity(cardId, activityData)
      
      // Phát sự kiện socket nếu có global.io
      if (global.io) {
        global.io.emit('BE_CARD_ACTIVITY_UPDATED', {
          cardId: cardId,
          activity: activityData,
          activityType: 'ARCHIVE'
        })
      }
    }
    
    return archivedCard
  } catch (error) { throw error }
}

/**
 * Khôi phục card từ trạng thái lưu trữ về trạng thái bình thường
 */
const unarchiveCard = async (cardId, userId, columnId) => {
  try {
    // Xử lý logic khi khôi phục card
    // Kiểm tra xem card có tồn tại và đã bị lưu trữ hay không
    const existingCard = await cardModel.findOneById(cardId)
    if (!existingCard) throw new ApiError(StatusCodes.NOT_FOUND, 'Card not found')
    if (!existingCard.archived) throw new ApiError(StatusCodes.BAD_REQUEST, 'Card is not archived')

    // Lấy thông tin user hiện tại (người thực hiện hành động)
    const user = await userModel.findOneById(userId)
    
    // Cập nhật lại columnId nếu được cung cấp
    const updateData = columnId ? { columnId } : {}
    
    // Khôi phục card từ trạng thái lưu trữ
    const unarchivedCard = await cardModel.unarchiveCard(cardId)
    
    // Ghi nhận hoạt động khôi phục vào activities
    if (user) {
      const activityData = {
        userId: userId,
        userAvatar: user.avatar,
        userDisplayName: user.displayName || user.username,
        action: 'RESTORE',
        content: `${user.displayName || 'Ai đó'} đã khôi phục thẻ này từ kho lưu trữ.`,
        activityAt: Date.now()
      }
      
      await cardModel.unshiftNewActivity(cardId, activityData)
      
      // Phát sự kiện socket nếu có global.io
      if (global.io) {
        global.io.emit('BE_CARD_ACTIVITY_UPDATED', {
          cardId: cardId,
          activity: activityData,
          activityType: 'RESTORE'
        })
      }
    }
    
    // Cập nhật dữ liệu khác nếu cần
    if (Object.keys(updateData).length > 0) {
      await cardModel.update(cardId, updateData)
    }

    // Thêm cardId vào mảng cardOrderIds của column
    await columnModel.pushCardOrderIds(unarchivedCard)

    return {
      unarchivedCard,
      unarchiveResult: 'Card unarchived successfully!'
    }
  } catch (error) { throw error }
}

/**
 * Lấy danh sách card đã được lưu trữ của một board
 */
const getArchivedCards = async (boardId) => {
  try {
    const archivedCards = await cardModel.getArchivedCards(boardId)
    return { archivedCards }
  } catch (error) { throw error }
}

/**
 * Xóa vĩnh viễn card khỏi cơ sở dữ liệu (chỉ dành cho board owner)
 */
const permanentDeleteCard = async (cardId, userId) => {
  try {
    // Tìm card cần xóa
    const targetCard = await cardModel.findOneById(cardId)
    if (!targetCard) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Card not found!')
    }

    // Xóa các tệp đính kèm trong card (nếu có)
    if (targetCard.attachments && targetCard.attachments.length > 0) {
      // Ở đây bạn có thể thêm code để xóa file từ S3, Cloudinary, hoặc nơi lưu trữ
      // Ví dụ: await S3Provider.deleteFiles(targetCard.attachments.map(att => att.fileUrl))
      console.log(`Deleting ${targetCard.attachments.length} attachments from card ${cardId}`)
    }

    // Xóa card khỏi cơ sở dữ liệu
    await cardModel.deleteOneById(cardId)

    // Xóa cardId khỏi mảng cardOrderIds trong column chứa nó
    await columnModel.pullCardOrderIds(targetCard)

    return { deleteResult: 'Card deleted permanently!' }
  } catch (error) { throw error }
}

const restore = async (cardId, updateData) => {
  try {
    const targetCard = await cardModel.findOneById(cardId)
    if (!targetCard) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Card not found!')
    }

    // Cập nhật card từ trạng thái lưu trữ về trạng thái bình thường
    // và cập nhật lại columnId nếu người dùng muốn khôi phục vào một column khác
    const restoreData = {
      ...updateData,
      isArchived: false,
      updatedAt: Date.now()
    }
    const restoredCard = await cardModel.update(cardId, restoreData)

    // Thêm cardId vào mảng cardOrderIds của column
    await columnModel.pushCardOrderIds(restoredCard)

    return restoredCard
  } catch (error) { throw error }
}

// Hàm mới để xử lý thêm attachments (thay thế uploadMultipleAttachments)
const addAttachments = async (cardId, files, userInfo) => {
  try {
    if (!files || files.length === 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'No files were uploaded')
    }

    const currentCard = await cardModel.findOneById(cardId)
    if (!currentCard) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Card not found!')
    }

    const newAttachmentsData = []
    for (const file of files) {
      try {
        const uploadResult = await S3Provider.uploadFile(
          file.buffer,
          file.originalname,
          'card-attachments'
        )
        newAttachmentsData.push({
          fileName: file.originalname,
          fileUrl: uploadResult.url,
          fileType: file.mimetype,
          fileSize: file.size,
          uploadedAt: Date.now(),
          uploadedBy: userInfo._id // Lấy userId từ thông tin user đã xác thực
        })
      } catch (uploadError) {
        // Log lỗi upload từng file nhưng không dừng toàn bộ quá trình
        console.error(`Failed to upload file ${file.originalname}:`, uploadError)
      }
    }

    // Chỉ cập nhật DB nếu có ít nhất 1 file upload thành công
    if (newAttachmentsData.length > 0) {
      // Gọi hàm model mới để push nhiều attachments cùng lúc
      const updatedCard = await cardModel.pushMultipleAttachments(cardId, newAttachmentsData)
      return updatedCard
    } else {
      // Nếu không có file nào upload thành công, trả về card hiện tại
      return currentCard 
    }

  } catch (error) { 
     // Ném lỗi ra ngoài để controller xử lý
     throw new ApiError(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Error adding attachments')
  }
}

// Gắn Label vào Card
const addLabelToCard = async (cardId, labelId, userId) => {
  try {
    // Validate card và label tồn tại, và thuộc cùng board (nếu cần)
    const card = await cardModel.findOneById(cardId)
    const label = await labelModel.findOneById(labelId)
    if (!card || !label) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Card or Label not found!')
    }
    if (card.boardId.toString() !== label.boardId.toString()) {
       throw new ApiError(StatusCodes.BAD_REQUEST, 'Card and Label do not belong to the same board!')
    }
    // Kiểm tra quyền (ví dụ: chỉ member của board mới được gắn label)

    // Kiểm tra xem label đã được gắn chưa để tránh trùng lặp
    if (card.labelIds?.map(id => id.toString()).includes(labelId)) {
        // Không làm gì cả hoặc trả về thông báo đã tồn tại
        console.log(`Label ${labelId} already added to card ${cardId}`)
        return card // Trả về card hiện tại
    }

    await cardModel.pushLabelId(cardId, labelId)
    const updatedCard = await cardModel.findOneById(cardId) // Lấy lại card đã cập nhật

    // Cần emit socket event cập nhật card ở đây

    return updatedCard
  } catch (error) { throw error }
}

// Gỡ Label khỏi Card
const removeLabelFromCard = async (cardId, labelId, userId) => {
  try {
    // Validate card và label tồn tại
    const card = await cardModel.findOneById(cardId)
    // Không cần validate label vì chỉ cần card tồn tại để $pull
    if (!card) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Card not found!')
    }
     // Kiểm tra quyền

    await cardModel.pullLabelId(cardId, labelId)
    const updatedCard = await cardModel.findOneById(cardId) // Lấy lại card đã cập nhật

    // Cần emit socket event cập nhật card ở đây

    return updatedCard
  } catch (error) { throw error }
}

/**
 * Lấy chi tiết thông tin của một card theo ID
 */
const getDetails = async (cardId) => {
  try {
    const card = await cardModel.findOneById(cardId)
    if (!card) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Card not found!')
    }
    return card
  } catch (error) { throw error }
}

export const cardService = {
  createNew,
  update,
  getDetails,
  deleteCard,
  archiveCard,
  unarchiveCard,
  getArchivedCards,
  permanentDeleteCard,
  restore,
  addAttachments,
  addLabelToCard,
  removeLabelFromCard
}
