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

  // Lắng nghe sự kiện tạo column mới
  socket.on('FE_COLUMN_CREATED', (data) => {
    // Gửi sự kiện đến tất cả người dùng khác (trừ người gửi)
    socket.broadcast.emit('BE_COLUMN_CREATED', data)
  })

  // Lắng nghe sự kiện xóa column
  socket.on('FE_COLUMN_DELETED', (data) => {
    // Gửi sự kiện đến tất cả người dùng khác (trừ người gửi)
    socket.broadcast.emit('BE_COLUMN_DELETED', data)
  })

  // Lắng nghe sự kiện cập nhật column
  socket.on('FE_COLUMN_UPDATED', (data) => {
    // Gửi sự kiện đến tất cả người dùng khác (trừ người gửi)
    socket.broadcast.emit('BE_COLUMN_UPDATED', data)
  })

  // Lắng nghe sự kiện tạo card mới
  socket.on('FE_CARD_CREATED', (data) => {
    // Gửi sự kiện đến tất cả người dùng khác (trừ người gửi)
    socket.broadcast.emit('BE_CARD_CREATED', data)
  })

  // Lắng nghe sự kiện xóa card
  socket.on('FE_CARD_DELETED', (data) => {
    // Gửi sự kiện đến tất cả người dùng khác (trừ người gửi)
    socket.broadcast.emit('BE_CARD_DELETED', data)
  })

  // Lắng nghe sự kiện cập nhật card
  socket.on('FE_CARD_UPDATED', (data) => {
    // Gửi sự kiện đến tất cả người dùng khác (trừ người gửi)
    socket.broadcast.emit('BE_CARD_UPDATED', data)
  })
}