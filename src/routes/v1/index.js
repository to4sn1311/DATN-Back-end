/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */

import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { boardRoute } from './boardRoute.js'
import { columnRoute } from './columnRoute.js'
import { cardRoute } from './cardRoute.js'
import { userRoute } from './userRoute.js'
import { invitationRoute } from './invitationRoute.js'
import { uploadRoute } from './upload.route.js'
import { notificationRoute } from './notificationRoute.js'

const Router = express.Router()

/** Check APIs v1/status */
Router.get('/status', (req, res) => {
  res.status(StatusCodes.OK).json({ status: 'OK!' })
})

/** Board APIs */
Router.use('/boards', boardRoute)

/** Hỗ trợ cả cấu trúc URL cũ và mới từ frontend */
Router.use('/boards/cards', cardRoute)

/** Column APIs */
Router.use('/columns', columnRoute)

/** Cards APIs */
Router.use('/cards', cardRoute)

/** User APIs */
Router.use('/users', userRoute)

/** Invitation APIs */
Router.use('/invitations', invitationRoute)

/** Upload APIs */
Router.use('/upload', uploadRoute)

/** Notification APIs */
Router.use('/notifications', notificationRoute)

export const APIs_V1 = Router
