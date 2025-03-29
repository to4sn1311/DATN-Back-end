/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */

import { cardModel } from '~/models/cardModel'
import { columnModel } from '~/models/columnModel'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'
import { S3Provider } from '~/providers/S3Provider'
import { ApiError } from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'

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

const update = async (cardId, reqBody, cardCoverFile, userInfo, attachmentFile = null) => {
  try {
    const updateData = {
      ...reqBody,
      updatedAt: Date.now()
    }

    let updatedCard = {}

    if (cardCoverFile) {
      const uploadResult = await CloudinaryProvider.streamUpload(cardCoverFile.buffer, 'card-covers')
      updatedCard = await cardModel.update(cardId, { cover: uploadResult.secure_url })
    } else if (attachmentFile) {
      // Xử lý upload file đính kèm lên S3
      const uploadResult = await S3Provider.uploadFile(
        attachmentFile.buffer,
        attachmentFile.originalname,
        'card-attachments'
      )

      // Tạo dữ liệu attachment để thêm vào Database
      const attachmentData = {
        fileName: attachmentFile.originalname,
        fileUrl: uploadResult.url,
        fileType: attachmentFile.mimetype,
        fileSize: attachmentFile.size,
        uploadedBy: userInfo._id
      }

      // Lấy card hiện tại để lấy danh sách attachments
      const currentCard = await cardModel.findOneById(cardId)
      const updatedAttachments = [...(currentCard.attachments || []), attachmentData]

      // Cập nhật card với attachment mới
      updatedCard = await cardModel.update(cardId, { attachments: updatedAttachments })
    } else if (updateData.commentToAdd) {
      // Tạo dữ liệu comment để thêm vào Database, cần bổ sung thêm những field cần thiết
      const commentData = {
        ...updateData.commentToAdd,
        commentedAt: Date.now(),
        userId: userInfo._id,
        userEmail: userInfo.email
      }
      updatedCard = await cardModel.unshiftNewComment(cardId, commentData)
    } else if (updateData.incomingMemberInfo) {
      // Trường hợp ADD hoặc REMOVE thành viên ra khỏi Card
      updatedCard = await cardModel.updateMembers(cardId, updateData.incomingMemberInfo)
    } else if (updateData.attachmentIdToRemove) {
      // Trường hợp xóa attachment khỏi card
      // Lấy card hiện tại để lấy danh sách attachments
      const currentCard = await cardModel.findOneById(cardId)
      
      // Tìm attachment cần xóa
      const attachmentToRemove = currentCard.attachments.find(
        att => att._id.toString() === updateData.attachmentIdToRemove
      )
      
      if (attachmentToRemove) {
        // Lấy key từ URL để xóa khỏi S3
        const fileKey = attachmentToRemove.fileUrl.split('/').slice(-2).join('/')
        
        // Xóa file khỏi S3
        await S3Provider.deleteFile(fileKey)
        
        // Cập nhật danh sách attachments mới không có attachment đã xóa
        const updatedAttachments = currentCard.attachments.filter(
          att => att._id.toString() !== updateData.attachmentIdToRemove
        )
        
        // Cập nhật card với danh sách attachments mới
        updatedCard = await cardModel.update(cardId, { attachments: updatedAttachments })
      } else {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Attachment not found!')
      }
    } else {
      // Các trường hợp update chung như title, description
      updatedCard = await cardModel.update(cardId, updateData)
    }


    return updatedCard
  } catch (error) { throw error }
}

const deleteItem = async (cardId) => {
  try {
    const targetCard = await cardModel.findOneById(cardId)
    if (!targetCard) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Card not found!')
    }

    // Xóa tất cả các attachment liên quan trước khi xóa card
    if (targetCard.attachments && targetCard.attachments.length > 0) {
      for (const attachment of targetCard.attachments) {
        try {
          // Lấy key từ URL để xóa khỏi S3
          const fileKey = attachment.fileUrl.split('/').slice(-2).join('/')
          
          // Xóa file khỏi S3
          await S3Provider.deleteFile(fileKey)
        } catch (error) {
          console.error('Error deleting attachment:', error)
          // Tiếp tục quá trình dù có lỗi khi xóa attachment
        }
      }
    }

    // Xóa card
    await cardModel.deleteOneById(cardId)

    // Cập nhật lại mảng cardOrderIds của column chứa nó
    await columnModel.pullCardOrderIds(targetCard)

    return { deleteResult: 'Card deleted successfully!' }
  } catch (error) { throw error }
}

export const cardService = {
  createNew,
  update,
  deleteItem
}
