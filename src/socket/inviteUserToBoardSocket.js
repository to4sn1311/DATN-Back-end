const { BE_USER_INVITED_TO_BOARD } = require('../constants/eventNames');

const inviteUserToBoardSocket = (io, socket) => {
  socket.on('FE_USER_INVITED_TO_BOARD', (invitation) => {
    // Emit event cho người được mời
    io.to(invitation.inviteeId).emit(BE_USER_INVITED_TO_BOARD, invitation);
  });
};

module.exports = inviteUserToBoardSocket; 