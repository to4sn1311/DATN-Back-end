/**
 * Updated by trungquandev.com's author on Oct 18 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */

import { env } from '~/config/environment'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

// Danh sách các domain được phép truy cập API
const WHITELIST_DOMAINS = [
  env.WEBSITE_DOMAIN_DEVELOPMENT,
  env.WEBSITE_DOMAIN_PRODUCTION,
  // Thêm domain của S3 bucket để cho phép upload/download
  `https://${env.AWS_S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com`
]

// Cấu hình CORS Option trong dự án thực tế (Video số 62 trong chuỗi MERN Stack Pro)
export const corsOptions = {
  origin: function (origin, callback) {
    // Cho phép các request không có origin (như mobile apps hoặc curl/postman)
    if (!origin || WHITELIST_DOMAINS.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error(`${origin} không được phép truy cập API!`))
    }
  },

  // Some legacy browsers (IE11, various SmartTVs) choke on 204
  optionsSuccessStatus: 200,

  // CORS sẽ cho phép nhận cookies từ request, (Nhá hàng :D | Ở khóa MERN Stack Advance nâng cao học trực tiếp mình sẽ hướng dẫn các bạn đính kèm jwt access token và refresh token vào httpOnly Cookies)
  credentials: true,

  // Cho phép các headers cần thiết
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'x-file-type']
}
