/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */
import { StatusCodes } from 'http-status-codes'
import { cardService } from '~/services/cardService'

const createNew = async (req, res, next) => {
  try {
    const createdCard = await cardService.createNew(req.body)
    res.status(StatusCodes.CREATED).json(createdCard)
  } catch (error) { next(error) }
}

const update = async (req, res, next) => {
  try {
    const cardId = req.params.id
    const cardCoverFile = req.file
    
    // Thêm thông tin người đang thực hiện request làm người gán task
    if (req.body.incomingMemberInfo) {
      req.body.assignedBy = req.jwtDecoded ? req.jwtDecoded.displayName : 'Someone'
    }
    
    const updatedCard = await cardService.update(cardId, req.body, cardCoverFile)

    res.status(StatusCodes.OK).json(updatedCard)
  } catch (error) {
    next(error)
  }
}

const deleteCard = async (req, res, next) => {
  try {
    const cardId = req.params.id
    const result = await cardService.deleteCard(cardId)

    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

const restore = async (req, res, next) => {
  try {
    const cardId = req.params.id
    const restoredCard = await cardService.restore(cardId, req.body)

    res.status(StatusCodes.OK).json(restoredCard)
  } catch (error) { next(error) }
}

const uploadMultipleAttachments = async (req, res, next) => {
  try {
    const cardId = req.params.id
    const userInfo = req.jwtDecoded
    
    if (!req.files || req.files.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        errors: 'Không có tệp đính kèm nào được tải lên'
      })
    }
    
    // Gọi service để xử lý upload nhiều file
    const updatedCard = await cardService.uploadMultipleAttachments(cardId, req.files, userInfo)
    
    res.status(StatusCodes.OK).json(updatedCard)
  } catch (error) { next(error) }
}

export const cardController = {
  createNew,
  update,
  deleteCard,
  restore,
  uploadMultipleAttachments
}
