export const OBJECT_ID_RULE = /^[0-9a-fA-F]{24}$/
export const OBJECT_ID_RULE_MESSAGE = 'Your string fails to match the Object Id pattern!'

// Một vài biểu thức chính quy - Regular Expression và custom message.
// Về Regular Expression khá hại não: https://viblo.asia/p/hoc-regular-expression-va-cuoc-doi-ban-se-bot-kho-updated-v22-Az45bnoO5xY
export const FIELD_REQUIRED_MESSAGE = 'This field is required.'
export const EMAIL_RULE = /^\S+@\S+\.\S+$/
export const EMAIL_RULE_MESSAGE = 'Email is invalid. (example@email.com)'
export const PASSWORD_RULE = /^(?=.*[a-zA-Z])(?=.*\d)[A-Za-z\d\W]{8,256}$/
export const PASSWORD_RULE_MESSAGE = 'Password must include at least 1 letter, a number, and at least 8 characters.'

export const LIMIT_COMMON_FILE_SIZE = 10485760 // byte = 10 MB
export const ALLOW_COMMON_FILE_TYPES = ['image/jpg', 'image/jpeg', 'image/png']

// Giới hạn và các loại file được phép cho file đính kèm
export const LIMIT_ATTACHMENT_FILE_SIZE = 20971520 // byte = 20 MB
export const ALLOW_ATTACHMENT_FILE_TYPES = [
  // Loại file hình ảnh
  'image/jpg', 'image/jpeg', 'image/png', 'image/gif', 'image/svg+xml',
  // Loại file văn bản và tài liệu
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
  'text/plain', 'text/csv',
  // Loại file nén
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
  // Loại file audio/video
  'audio/mpeg', 'audio/wav', 'video/mp4', 'video/mpeg'
]

export const singleFileValidator = (file) => {
  if (!file) return 'Please select a file.'

  if (!ALLOW_COMMON_FILE_TYPES.includes(file.type))
    return 'File type is not supported. Only allow jpg, jpeg, png.'

  if (file.size > LIMIT_COMMON_FILE_SIZE)
    return 'File size is too large. Max allowed size is 10MB.'

  return null
}

export const attachmentFileValidator = (file) => {
  if (!file) return 'Please select a file.'

  if (!ALLOW_ATTACHMENT_FILE_TYPES.includes(file.type))
    return 'File type is not supported. Only allow common file types like image, document, spreadsheet, etc.'

  if (file.size > LIMIT_ATTACHMENT_FILE_SIZE)
    return 'File size is too large. Max allowed size is 20MB.'

  return null
}
