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
    const userInfo = req.jwtDecoded
    const updatedCard = await cardService.update(cardId, req.body, cardCoverFile, userInfo)

    res.status(StatusCodes.OK).json(updatedCard)
  } catch (error) { next(error) }
}

const uploadAttachment = async (req, res, next) => {
  try {
    const cardId = req.params.id
    const attachmentFile = req.file
    const userInfo = req.jwtDecoded

    if (!attachmentFile) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Please upload a file'
      })
    }

    const updatedCard = await cardService.update(
      cardId, 
      req.body, 
      null, // không có cardCoverFile
      userInfo, 
      attachmentFile // truyền file đính kèm
    )

    res.status(StatusCodes.OK).json(updatedCard)
  } catch (error) { next(error) }
}

const deleteItem = async (req, res, next) => {
  try {
    const cardId = req.params.id
    const result = await cardService.deleteItem(cardId)

    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

export const cardController = {
  createNew,
  update,
  uploadAttachment,
  deleteItem
}
