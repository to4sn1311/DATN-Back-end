/* eslint-disable no-useless-catch */
/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */

import { slugify } from '~/utils/formatters'
import { boardModel } from '~/models/boardModel'
import { columnModel } from '~/models/columnModel'
import { cardModel } from '~/models/cardModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { cloneDeep } from 'lodash'
import { DEFAULT_PAGE, DEFAULT_ITEMS_PER_PAGE } from '~/utils/constants'
import { ObjectId } from 'mongodb'
import { userModel } from '~/models/userModel'
import { invitationModel } from '~/models/invitationModel'
import { pickUser } from '~/utils/formatters'
import { labelModel } from '~/models/labelModel'

const createNew = async (userId, reqBody) => {
  try {
    // Xử lý logic dữ liệu tùy đặc thù dự án
    const newBoard = {
      ...reqBody,
      slug: slugify(reqBody.title)
    }

    // Gọi tới tầng Model để xử lý lưu bản ghi newBoard vào trong Database
    const createdBoard = await boardModel.createNew(userId, newBoard)

    // Lấy bản ghi board sau khi gọi (tùy mục đích dự án mà có cần bước này hay không)
    const getNewBoard = await boardModel.findOneById(createdBoard.insertedId)

    // Làm thêm các xử lý logic khác với các Collection khác tùy đặc thù dự án...vv
    // Bắn email, notification về cho admin khi có 1 cái board mới được tạo...vv

    // Trả kết quả về, trong Service luôn phải có return
    return getNewBoard
  } catch (error) { throw error }
}

const getDetails = async (boardId, user) => {
  try {
    // Lấy thông tin board cơ bản
    const board = await boardModel.findOneById(boardId)
    if (!board) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Board not found!')
    }

    // Lấy tất cả columns thuộc board
    const columns = await columnModel.findByBoardId(boardId)

    // Lấy tất cả cards thuộc board (chưa archived)
    const cards = await cardModel.findActiveByBoardId(boardId)
    
    // Lấy tất cả labels thuộc board
    const labels = await labelModel.findByBoardId(boardId)

    // Lấy thông tin owners và members
    const owners = await userModel.findUsersByIds(board.ownerIds)
    const members = await userModel.findUsersByIds(board.memberIds)

    // Tạo response board object
    const resBoard = cloneDeep(board)
    resBoard.columns = columns
    resBoard.labels = labels // Gán labels
    resBoard.owners = owners
    resBoard.members = members
    
    // Gắn cards vào đúng column của nó
    resBoard.columns.forEach(column => {
      column.cards = cards.filter(card => card.columnId.equals(column._id))
    })

    // Xóa ownerIds và memberIds không cần thiết nữa nếu đã có thông tin đầy đủ
    // delete resBoard.ownerIds;
    // delete resBoard.memberIds;

    // Xử lý lời mời nếu cần (logic cũ giữ nguyên)
    const boardMemberIds = [...resBoard.owners.map(u => u._id), ...resBoard.members.map(u => u._id)].map(id => id.toString())
    if (user && boardMemberIds.includes(user._id.toString())) {
      // ... (logic tìm lời mời)
    }

    return resBoard
  } catch (error) { 
      console.error('Error in boardService.getDetails:', error);
      throw error; // Re-throw the error after logging
  }
}

const update = async (boardId, reqBody) => {
  try {
    const updateData = {
      ...reqBody,
      updatedAt: Date.now()
    }
    const updatedBoard = await boardModel.update(boardId, updateData)

    return updatedBoard
  } catch (error) { throw error }
}

const moveCardToDifferentColumn = async (reqBody) => {
  try {
    // B1: Cập nhật mảng cardOrderIds của Column ban đầu chứa nó (Hiểu bản chất là xóa cái _id của Card ra khỏi mảng)
    await columnModel.update(reqBody.prevColumnId, {
      cardOrderIds: reqBody.prevCardOrderIds,
      updatedAt: Date.now()
    })
    // B2: Cập nhật mảng cardOrderIds của Column tiếp theo (Hiểu bản chất là thêm _id của Card vào mảng)
    await columnModel.update(reqBody.nextColumnId, {
      cardOrderIds: reqBody.nextCardOrderIds,
      updatedAt: Date.now()
    })
    // B3: Cập nhật lại trường columnId mới của cái Card đã kéo
    await cardModel.update(reqBody.currentCardId, {
      columnId: reqBody.nextColumnId
    })

    return { updateResult: 'Successfully!' }
  } catch (error) { throw error }
}

const getBoards = async (userId, page, itemsPerPage, queryFilters) => {
  try {
    // Nếu không tồn tại page hoặc itemsPerPage từ phía FE thì BE sẽ cần phải luôn gán giá trị mặc định
    if (!page) page = DEFAULT_PAGE
    if (!itemsPerPage) itemsPerPage = DEFAULT_ITEMS_PER_PAGE

    const results = await boardModel.getBoards(
      userId,
      parseInt(page, 10),
      parseInt(itemsPerPage, 10),
      queryFilters
    )

    return results
  } catch (error) { throw error }
}

export const boardService = {
  createNew,
  getDetails,
  update,
  moveCardToDifferentColumn,
  getBoards
}
