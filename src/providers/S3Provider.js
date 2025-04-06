import AWS from 'aws-sdk'
import { env } from '~/config/environment'

// Cấu hình AWS S3
const s3 = new AWS.S3({
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  region: env.AWS_REGION
})

// Log thông tin AWS S3 config để debug (ẩn secret key)
console.log('AWS S3 Config:', {
  accessKeyId: env.AWS_ACCESS_KEY_ID ? env.AWS_ACCESS_KEY_ID.substring(0, 5) + '...' : 'undefined',
  region: env.AWS_REGION,
  bucketName: env.AWS_S3_BUCKET_NAME
})

/**
 * Upload file lên AWS S3
 * @param {Buffer} fileBuffer - Buffer của file cần upload
 * @param {String} fileName - Tên file (sẽ được sử dụng làm key trong S3)
 * @param {String} folderName - Thư mục trên S3 để lưu file
 * @returns {Promise} - Promise chứa thông tin file đã upload
 */
const uploadFile = (fileBuffer, fileName, folderName) => {
  console.log(`Attempting to upload file: ${fileName} to folder: ${folderName}, file size: ${fileBuffer?.length || 'N/A'} bytes`)
  
  return new Promise((resolve, reject) => {
    // Chuẩn bị params cho S3
    const s3Key = `${folderName}/${Date.now()}_${fileName}`
    const params = {
      Bucket: env.AWS_S3_BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentDisposition: 'inline'
    }

    console.log('S3 upload params:', {
      Bucket: params.Bucket,
      Key: s3Key,
      ContentDisposition: params.ContentDisposition,
      BodySize: fileBuffer?.length || 'N/A'
    })

    // Upload file lên S3
    s3.upload(params, (err, data) => {
      if (err) {
        console.error('S3 upload error:', err)
        reject(err)
      } else {
        console.log('S3 upload success:', {
          Location: data.Location,
          Key: data.Key
        })
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
        console.error('S3 delete error:', err)
        reject(err)
      } else {
        console.log('S3 delete success:', fileKey)
        resolve(data)
      }
    })
  })
}

// Hàm kiểm tra kết nối tới S3
const checkConnection = () => {
  return new Promise((resolve, reject) => {
    s3.listBuckets((err, data) => {
      if (err) {
        console.error('S3 connection error:', err)
        reject(err)
      } else {
        const foundBucket = data.Buckets.find(bucket => bucket.Name === env.AWS_S3_BUCKET_NAME)
        console.log('S3 connection success, found buckets:', data.Buckets.map(b => b.Name))
        console.log('Target bucket exists:', !!foundBucket)
        resolve(data)
      }
    })
  })
}

// Kiểm tra kết nối khi khởi động server
checkConnection().catch(err => {
  console.error('Failed to connect to AWS S3:', err.message)
})

export const S3Provider = { uploadFile, deleteFile, checkConnection }