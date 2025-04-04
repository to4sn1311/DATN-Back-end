import { StatusCodes } from 'http-status-codes'
import { labelService } from '~/services/labelService'

const createNewLabel = async (req, res, next) => {
  try {
    // userId sẽ được lấy từ middleware xác thực JWT
    const userId = req.jwtDecoded._id
    const createdLabel = await labelService.createNewLabel(req.body, userId)
    res.status(StatusCodes.CREATED).json(createdLabel)
  } catch (error) { next(error) }
}

// Controller này có thể không cần thiết nếu labels được lấy cùng với board
// const getLabelsByBoard = async (req, res, next) => {
//   try {
//     const boardId = req.params.boardId; // Giả sử lấy boardId từ params
//     const labels = await labelService.getLabelsByBoard(boardId);
//     res.status(StatusCodes.OK).json(labels);
//   } catch (error) { next(error); }
// };

const updateLabel = async (req, res, next) => {
  try {
    const labelId = req.params.labelId
    const userId = req.jwtDecoded._id
    const updatedLabel = await labelService.updateLabel(labelId, req.body, userId)
    res.status(StatusCodes.OK).json(updatedLabel)
  } catch (error) { next(error) }
}

const deleteLabel = async (req, res, next) => {
  try {
    const labelId = req.params.labelId
    const userId = req.jwtDecoded._id
    const result = await labelService.deleteLabel(labelId, userId)
    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

export const labelController = {
  createNewLabel,
  // getLabelsByBoard, // Cân nhắc xem có cần API riêng không
  updateLabel,
  deleteLabel
} 