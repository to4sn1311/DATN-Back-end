import AWS from 'aws-sdk'
import { env } from '~/config/environment'

// Cấu hình AWS S3
const s3 = new AWS.S3({
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  region: env.AWS_REGION
})

/**
 * Upload file lên AWS S3
 * @param {Buffer} fileBuffer - Buffer của file cần upload
 * @param {String} fileName - Tên file (sẽ được sử dụng làm key trong S3)
 * @param {String} folderName - Thư mục trên S3 để lưu file
 * @returns {Promise} - Promise chứa thông tin file đã upload
 */
const uploadFile = (fileBuffer, fileName, folderName) => {
  return new Promise((resolve, reject) => {
    // Chuẩn bị params cho S3
    const params = {
      Bucket: env.AWS_S3_BUCKET_NAME,
      Key: `${folderName}/${Date.now()}_${fileName}`,
      Body: fileBuffer,
      ContentDisposition: 'inline',
      ACL: 'public-read'
    }

    // Upload file lên S3
    s3.upload(params, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve({
          url: data.Location,
          key: data.Key
        })
      }
    })
  })
}

/**
 * Xóa file khỏi AWS S3
 * @param {String} fileKey - Key của file cần xóa
 * @returns {Promise} - Promise chứa kết quả xóa file
 */
const deleteFile = (fileKey) => {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: env.AWS_S3_BUCKET_NAME,
      Key: fileKey
    }

    s3.deleteObject(params, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

export const S3Provider = { uploadFile, deleteFile }