import { labelModel } from '~/models/labelModel'
import { boardModel } from '~/models/boardModel'
import { cardModel } from '~/models/cardModel' // Cần để xử lý khi xóa label
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

const createNewLabel = async (reqBody, userId) => {
  try {
    // Validate board existence and user permission (owner/admin?) - Tạm thời yêu cầu board tồn tại
    const board = await boardModel.findOneById(reqBody.boardId)
    if (!board) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Board not found!')
    }
    // Thêm logic kiểm tra quyền nếu cần

    // Tạo label mới
    const newLabelData = {
      ...reqBody,
      boardId: board._id.toString() // Đảm bảo boardId là string
    }

    const createdLabel = await labelModel.createNew(newLabelData)
    const getNewLabel = await labelModel.findOneById(createdLabel.insertedId)

    return getNewLabel
  } catch (error) { throw error }
}

const getLabelsByBoard = async (boardId) => {
   try {
    const labels = await labelModel.findByBoardId(boardId)
    return labels
  } catch (error) { throw error }
}

const updateLabel = async (labelId, reqBody, userId) => {
   try {
    const label = await labelModel.findOneById(labelId)
    if (!label) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Label not found!')
    }

    // Validate board existence and user permission if needed
    const board = await boardModel.findOneById(label.boardId)
     if (!board) {
      // Should not happen if label exists, but check anyway
      throw new ApiError(StatusCodes.NOT_FOUND, 'Board associated with the label not found!')
    }
    // Add permission check if necessary (e.g., only board owner can update)

    const updateData = {
      ...reqBody,
      updatedAt: Date.now()
    }
    const updatedLabel = await labelModel.update(labelId, updateData)

    // Cần cập nhật real-time ở đây nếu muốn giao diện quản lý label cập nhật tự động

    return updatedLabel
  } catch (error) { throw error }
}

const deleteLabel = async (labelId, userId) => {
  try {
    const label = await labelModel.findOneById(labelId)
    if (!label) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Label not found!')
    }

     // Validate board existence and user permission if needed
    const board = await boardModel.findOneById(label.boardId)
     if (!board) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Board associated with the label not found!')
    }
    // Add permission check if necessary

    // Bước 1: Xóa (mềm) label khỏi collection labels
    await labelModel.deleteOneById(labelId)

    // Bước 2: Gỡ labelId này khỏi tất cả các card trong board đang chứa nó
    await cardModel.pullLabelFromAllCards(label.boardId, labelId)

     // Cần cập nhật real-time ở đây

    return { deleteResult: 'Label deleted successfully!' }
  } catch (error) { throw error }
}


export const labelService = {
  createNewLabel,
  getLabelsByBoard,
  updateLabel,
  deleteLabel
} 