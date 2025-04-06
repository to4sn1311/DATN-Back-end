/**
 * Socket handler để xử lý các sự kiện real-time cho board
 */
import { cardModel } from '~/models/cardModel'
// import { ObjectId } from 'mongodb'

// Xử lý sự kiện real-time khi có người di chuyển column hoặc card
export const boardRealtimeSocket = (socket) => {
  // Lắng nghe sự kiện di chuyển column
  socket.on('FE_COLUMNS_UPDATED', (data) => {
    // Gửi sự kiện đến tất cả người dùng khác (trừ người gửi)
    socket.broadcast.emit('BE_COLUMNS_UPDATED', data)
  })

  // Lắng nghe sự kiện di chuyển card trong cùng column
  socket.on('FE_CARDS_UPDATED', (data) => {
    // Gửi sự kiện đến tất cả người dùng khác (trừ người gửi)
    socket.broadcast.emit('BE_CARDS_UPDATED', data)
  })

  // Lắng nghe sự kiện di chuyển card sang column khác
  socket.on('FE_CARD_MOVED_DIFFERENT_COLUMN', (data) => {
    // Gửi sự kiện đến tất cả người dùng khác (trừ người gửi)
    socket.broadcast.emit('BE_CARD_MOVED_DIFFERENT_COLUMN', data)
  })

  // Lắng nghe sự kiện cập nhật card (ví dụ: checkbox isCompleted thay đổi)
  socket.on('FE_CARD_UPDATED', (data) => {
    // Gửi sự kiện đến tất cả người dùng khác (trừ người gửi)
    socket.broadcast.emit('BE_CARD_UPDATED', data)
  })

  // Lắng nghe sự kiện cập nhật activity của card
  socket.on('FE_CARD_ACTIVITY_UPDATED', (data) => {
    // console.log('Server nhận sự kiện FE_CARD_ACTIVITY_UPDATED:', {
    //   cardId: data.cardId,
    //   activityType: data.activityType,
    //   socketId: socket.id
    // })
    // Gửi sự kiện đến tất cả người dùng khác (trừ người gửi)
    socket.broadcast.emit('BE_CARD_ACTIVITY_UPDATED', data)
    // console.log('Server đã phát sự kiện BE_CARD_ACTIVITY_UPDATED')
  })

  // Lắng nghe sự kiện cập nhật thành viên của card
  socket.on('FE_CARD_MEMBERS_UPDATED', (data) => {
    // console.log('Server nhận sự kiện FE_CARD_MEMBERS_UPDATED:', {
    //   boardId: data.boardId,
    //   socketId: socket.id
    // })
    // Gửi sự kiện đến tất cả người dùng khác (trừ người gửi)
    socket.broadcast.emit('BE_CARD_MEMBERS_UPDATED', data)
    // console.log('Server đã phát sự kiện BE_CARD_MEMBERS_UPDATED')
  })

  // Lắng nghe sự kiện xác nhận đã đọc thông báo gán task từ client
  // socket.on('FE_CARD_ASSIGNMENT_NOTIFICATION_READ', (data) => {
  //   console.log('Người dùng đã đọc thông báo gán task:', data)
  // })

  // Lắng nghe sự kiện xóa hoặc lưu trữ card
  socket.on('FE_CARD_DELETED', async (data) => {
    // console.log('Server nhận sự kiện FE_CARD_DELETED:', {
    //   boardId: data.boardId,
    //   cardId: data.cardId,
    //   action: data.action || 'deleted',
    //   socketId: socket.id
    // })

    // Gửi sự kiện đến tất cả người dùng khác (trừ người gửi)
    socket.broadcast.emit('BE_CARD_DELETED', data)

    // Không gửi thông báo cho các hoạt động lưu trữ/xóa thẻ nữa
    if (data.action === 'archived' && data.updater && data.cardId) {
      try {
        // Tạo dữ liệu hoạt động
        const activityData = {
          userId: data.updater._id,
          userAvatar: data.updater.avatar,
          userDisplayName: data.updater.displayName || data.updater.username || 'Ai đó',
          action: 'ARCHIVE',
          content: `${data.updater.displayName || 'Ai đó'} đã lưu trữ thẻ này.`,
          activityAt: new Date().getTime()
        }

        // Ghi hoạt động vào card
        await cardModel.unshiftNewActivity(data.cardId, activityData)

        // Phát sự kiện cập nhật activity
        socket.broadcast.emit('BE_CARD_ACTIVITY_UPDATED', {
          cardId: data.cardId,
          activity: activityData,
          activityType: 'ARCHIVE'
        })
      } catch (error) {
        // console.error('Lỗi khi ghi hoạt động vào card:', error)
      }
    }

    // console.log('Server đã phát sự kiện BE_CARD_DELETED')
  })
}