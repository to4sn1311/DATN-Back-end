/**
 * Socket handler để xử lý các sự kiện real-time cho board
 */

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
}