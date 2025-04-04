/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */

import { StatusCodes } from 'http-status-codes'
import { cardService } from '~/services/cardService'
import { boardService } from '~/services/boardService'
import { userService } from '~/services/userService'
import { ApiError } from '~/utils/ApiError'

const createNew = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const createdCard = await cardService.createNew(req.body, userId)
    res.status(StatusCodes.CREATED).json(createdCard)
  } catch (error) { next(error) }
}

const getDetails = async (req, res, next) => {
  try {
    const cardId = req.params.id
    const card = await cardService.getDetails(cardId)
    res.status(StatusCodes.OK).json(card)
  } catch (error) { next(error) }
}

const update = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const cardId = req.params.id
    const file = req.file 
    
    // Truyền cả req.body, file, và userId vào service
    const updatedCard = await cardService.update(cardId, req.body, file, userId)

    // Kiểm tra nếu có thành viên mới được thêm vào card
    if (req.body.incomingMemberInfo && req.body.incomingMemberInfo.action === 'ADD') {
      try {
        // Lấy thông tin của user gán nhiệm vụ từ jwt token
        const assigner = {
          displayName: req.jwtDecoded.displayName || req.jwtDecoded.username
        }
        
        // Lấy thông tin của board chứa card
        const card = await cardService.getDetails(cardId)
        const board = await boardService.getDetails(card.boardId)
        
        // Lấy thông tin người được gán nhiệm vụ
        const assigneeId = req.body.incomingMemberInfo.userId
        
        // Gửi thông báo qua socket.io
        global.io.emit('BE_CARD_ASSIGNMENT_NOTIFICATION', {
          userId: assigneeId,
          assignedById: userId,
          assignedBy: assigner.displayName,
          cardId: cardId,
          cardTitle: card.title,
          boardId: card.boardId,
          boardTitle: board.title
        })
      } catch (error) {
        console.error('Lỗi khi gửi thông báo gán nhiệm vụ:', error)
        // Không throw lỗi để không ảnh hưởng đến việc cập nhật card
      }
    }

    res.status(StatusCodes.OK).json(updatedCard)
  } catch (error) { next(error) }
}

const moveCardToDifferentColumn = async (req, res, next) => {
  try {
    const result = await cardService.moveCardToDifferentColumn(
      req.body.currentCardId,
      req.body.prevColumnId,
      req.body.nextColumnId,
      req.body.prevCardOrderIds,
      req.body.nextCardOrderIds
    )

    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

// API xóa một card (do FE đang dùng API này, nhưng thực chất là archive card chứ không xóa hoàn toàn)
const deleteCard = async (req, res, next) => {
  try {
    const cardId = req.params.id
    const result = await cardService.deleteCard(cardId)

    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

// API khôi phục một card đã bị archive
const restoreCard = async (req, res, next) => {
  try {
    const cardId = req.params.id
    const result = await cardService.restoreCard(cardId, req.body)

    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

const permanentDeleteCard = async (req, res, next) => {
  try {
    const cardId = req.params.id
    const userId = req.jwtDecoded._id
    
    const result = await cardService.permanentDeleteCard(cardId, userId)

    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

/**
 * Đánh dấu card là đã được lưu trữ
 */
const archiveCard = async (req, res, next) => {
  try {
    const cardId = req.params.id
    const userId = req.jwtDecoded._id
    
    const result = await cardService.archiveCard(cardId, userId)
    
    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

/**
 * Hủy đánh dấu lưu trữ card
 */
const unarchiveCard = async (req, res, next) => {
  try {
    const cardId = req.params.id
    const { columnId } = req.body
    
    const result = await cardService.unarchiveCard(cardId, columnId)
    
    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

/**
 * Lấy danh sách card đã lưu trữ của board
 */
const getArchivedCards = async (req, res, next) => {
  try {
    const boardId = req.params.boardId
    
    const result = await cardService.getArchivedCards(boardId)
    
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

// Hàm controller mới để xử lý thêm attachments
const addAttachments = async (req, res, next) => {
  try {
    const cardId = req.params.id
    const userInfo = req.jwtDecoded // Lấy thông tin user đã xác thực
    const files = req.files // Lấy mảng files từ multer

    if (!files || files.length === 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'No files were uploaded')
    }

    const updatedCard = await cardService.addAttachments(cardId, files, userInfo)
    res.status(StatusCodes.OK).json(updatedCard)
  } catch (error) {
    next(error)
  }
}

// Gắn Label vào Card
const addLabelToCard = async (req, res, next) => {
  try {
    const { cardId } = req.params
    const { labelId } = req.body // Lấy labelId từ body
    const userId = req.jwtDecoded._id
    
    if (!labelId) {
       throw new ApiError(StatusCodes.BAD_REQUEST, 'labelId is required in the request body')
    }

    const updatedCard = await cardService.addLabelToCard(cardId, labelId, userId)
    res.status(StatusCodes.OK).json(updatedCard)
  } catch (error) { next(error) }
}

// Gỡ Label khỏi Card
const removeLabelFromCard = async (req, res, next) => {
  try {
    const { cardId, labelId } = req.params // Lấy labelId từ params
    const userId = req.jwtDecoded._id

    const updatedCard = await cardService.removeLabelFromCard(cardId, labelId, userId)
    res.status(StatusCodes.OK).json(updatedCard)
  } catch (error) { next(error) }
}

export const cardController = {
  createNew,
  getDetails,
  update,
  moveCardToDifferentColumn,
  deleteCard,
  restoreCard,
  permanentDeleteCard,
  archiveCard,
  unarchiveCard,
  getArchivedCards,
  restore,
  addAttachments,
  addLabelToCard,
  removeLabelFromCard
}
