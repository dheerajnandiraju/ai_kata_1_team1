import mongoose from 'mongoose'
import { beforeAll, afterAll } from 'vitest'

beforeAll(async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/osms_test'
  await mongoose.connect(uri)
})

afterAll(async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
})
