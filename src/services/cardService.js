/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */

import { cardModel } from '~/models/cardModel'
import { columnModel } from '~/models/columnModel'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { S3Provider } from '~/providers/S3Provider'

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

const uploadMultipleAttachments = async (cardId, files, userInfo) => {
  try {
    console.log(`Starting uploadMultipleAttachments for cardId: ${cardId}, files count: ${files?.length || 0}`)
    
    if (!files || files.length === 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'No files were uploaded')
    }
    
    // Lấy thông tin card hiện tại
    const currentCard = await cardModel.findOneById(cardId)
    if (!currentCard) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Card not found!')
    }
    
    console.log(`Card found: ${currentCard._id}, current attachments: ${currentCard.attachments?.length || 0}`)
    
    // Mảng lưu các attachment mới
    const newAttachments = []
    
    // Upload từng file lên S3
    for (const file of files) {
      try {
        console.log(`Processing file: ${file.originalname}, size: ${file.size}, type: ${file.mimetype}`)
        
        const uploadResult = await S3Provider.uploadFile(
          file.buffer,
          file.originalname,
          'card-attachments'
        )
        
        console.log(`Upload successful for file: ${file.originalname}, url: ${uploadResult.url}`)
        
        // Tạo dữ liệu attachment để thêm vào database
        const attachmentData = {
          fileName: file.originalname,
          fileUrl: uploadResult.url,
          fileType: file.mimetype,
          fileSize: file.size,
          uploadedAt: Date.now(),
          uploadedBy: userInfo._id
        }
        
        newAttachments.push(attachmentData)
      } catch (uploadError) {
        console.error(`Failed to upload file ${file.originalname}:`, uploadError)
        console.error('Upload error details:', {
          message: uploadError.message, 
          stack: uploadError.stack,
          code: uploadError.code,
          statusCode: uploadError.statusCode
        })
      }
    }
    
    if (newAttachments.length === 0) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to upload files')
    }
    
    // Tạo mảng attachments mới bằng cách kết hợp attachments hiện tại và mới
    const updatedAttachments = [...(currentCard.attachments || []), ...newAttachments]
    
    console.log(`Updating card with ${newAttachments.length} new attachments, total: ${updatedAttachments.length}`)
    
    // Cập nhật card với danh sách attachments mới
    const updatedCard = await cardModel.update(cardId, { 
      attachments: updatedAttachments,
      updatedAt: Date.now()
    })
    
    console.log(`Card updated successfully, id: ${updatedCard._id}`)
    
    return updatedCard
  } catch (error) { 
    console.error('Error in uploadMultipleAttachments:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode
    })
    throw error 
  }
}

export const cardService = {
  createNew,
  update,
  deleteCard,
  restore,
  uploadMultipleAttachments
}
