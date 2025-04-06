import { MongoClient } from 'mongodb'
import 'dotenv/config'

// Lấy các biến môi trường cần thiết
const MONGODB_URI = process.env.MONGODB_URI
const DATABASE_NAME = process.env.DATABASE_NAME
const CARD_COLLECTION_NAME = 'cards'

const migrationAddArchiveToCards = async () => {
  if (!MONGODB_URI) {
    console.error('Lỗi: Không tìm thấy MONGODB_URI trong biến môi trường')
    process.exit(1)
  }

  if (!DATABASE_NAME) {
    console.error('Lỗi: Không tìm thấy DATABASE_NAME trong biến môi trường')
    process.exit(1)
  }

  let client
  try {
    console.log('Kết nối đến MongoDB...')
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    
    const database = client.db(DATABASE_NAME)
    const cardCollection = database.collection(CARD_COLLECTION_NAME)
    
    console.log('Bắt đầu migration: Thêm các trường lưu trữ vào bộ sưu tập thẻ')
    
    // Cập nhật tất cả các thẻ hiện có để có trường archived được đặt thành false
    const result = await cardCollection.updateMany(
      { archived: { $exists: false } },
      { 
        $set: { 
          archived: false,
          archivedAt: null,
          archivedBy: null
        }
      }
    )
    
    console.log(`Migration hoàn tất thành công. Đã sửa đổi ${result.modifiedCount} tài liệu.`)
    
  } catch (error) {
    console.error('Migration thất bại:', error)
  } finally {
    if (client) {
      console.log('Đóng kết nối đến MongoDB')
      await client.close()
    }
  }
}

// Chạy migration
console.log('Bắt đầu chạy script migration để thêm các trường lưu trữ vào cards')
migrationAddArchiveToCards()
  .then(() => console.log('Script migration đã hoàn tất'))
  .catch(error => console.error('Lỗi trong quá trình chạy script migration:', error)) 