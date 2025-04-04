import { cardModel } from '~/models/cardModel'
import { columnModel } from '~/models/columnModel'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { S3Provider } from '~/providers/S3Provider'
import { ObjectId } from 'mongodb'
import { userModel } from '~/models/userModel'
import { labelModel } from '~/models/labelModel'

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
    // để có displayName gửi kèm trong notification
    if (userId) {
      assigner = await userModel.findOneById(userId)
    }

    if (uploadedFile && uploadedFile.fieldname === 'cardCover') {
      const uploadResult = await S3Provider.uploadFile(uploadedFile.buffer, uploadedFile.originalname, 'card-cover')
      updatedCard = await cardModel.update(cardId, {
        cover: uploadResult.url,
        updatedAt: Date.now()
      })
    } else if (reqBody.incomingMemberInfo) {
      updatedCard = await cardModel.updateMembers(cardId, reqBody.incomingMemberInfo)
      
      if (updatedCard.isAddAction) {
        const card = await cardModel.findOneById(cardId)
        if (global.io && assigner) { // Kiểm tra assigner tồn tại
          global.io.emit('BE_CARD_ASSIGNMENT_NOTIFICATION', {
            userId: reqBody.incomingMemberInfo.userId,
            assignedById: assigner._id, // Thêm assignedById
            assignedBy: assigner.displayName || assigner.username, // Sử dụng displayName từ assigner
            cardId: cardId,
            cardTitle: card.title,
            boardId: card.boardId,
            columnId: card.columnId
          })
        }
      }
    } else if (reqBody.commentToAdd) {
      const commentData = {
        ...reqBody.commentToAdd,
        userId: new ObjectId(userId), // Dùng userId từ tham số
        userAvatar: assigner?.avatar, // Lấy avatar từ assigner
        userDisplayName: assigner?.displayName || assigner?.username, // Lấy tên từ assigner
        commentedAt: Date.now()
      }
      updatedCard = await cardModel.unshiftNewComment(cardId, commentData)
      
      // Emit sự kiện comment mới sau khi thêm thành công
      if (global.io && updatedCard) {
        const card = await cardModel.findOneById(cardId) // Lấy lại card để có members
        global.io.emit('BE_NEW_COMMENT_NOTIFICATION', {
          userId: userId,
          userName: commentData.userDisplayName,
          cardId: cardId,
          cardTitle: updatedCard.title,
          boardId: updatedCard.boardId,
          cardMembers: card.memberIds || [] // Gửi kèm memberIds
          // mentionedUserIds: [] // Cần logic để parse @mention nếu muốn
        })
      }
    } else if (reqBody.attachmentIdToRemove) {
      const fileUrlToRemove = reqBody.attachmentIdToRemove
      updatedCard = await cardModel.pullAttachment(cardId, fileUrlToRemove)
      // Cần thêm logic xóa file khỏi S3/Cloudinary ở đây nếu cần
      // await S3Provider.deleteFileByUrl(fileUrlToRemove)
    } else if (uploadedFile && uploadedFile.fieldname === 'attachmentFile') {
      // ... (logic upload attachment đơn lẻ)
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
    const targetCard = await cardModel.findOneById(cardId)
    if (!targetCard) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Card not found!')
    }

    // Đánh dấu card là đã lưu trữ
    const archivedCard = await cardModel.archiveCard(cardId, userId)

    // Xóa cardId khỏi mảng cardOrderIds trong column chứa nó
    await columnModel.pullCardOrderIds(targetCard)

    return { 
      archivedCard,
      archiveResult: 'Card archived successfully!' 
    }
  } catch (error) { throw error }
}

/**
 * Khôi phục card từ trạng thái lưu trữ về trạng thái bình thường
 */
const unarchiveCard = async (cardId, columnId) => {
  try {
    const targetCard = await cardModel.findOneById(cardId)
    if (!targetCard) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Card not found!')
    }

    // Cập nhật lại columnId nếu được cung cấp
    const updateData = columnId ? { columnId } : {}
    
    // Khôi phục card từ trạng thái lưu trữ
    const unarchivedCard = await cardModel.unarchiveCard(cardId)
    
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
