const path = require('path')
const mongoose = require('mongoose')

require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const Board = require('../models/Board')

async function backfillBoardMembers() {
  try {
    await mongoose.connect(process.env.MONGO_URI)

    const result = await Board.updateMany(
      {
        $or: [
          { members: { $exists: false } },
          { members: { $size: 0 } },
        ],
      },
      [
        {
          $set: {
            members: [{ userId: '$ownerId', role: 'owner' }],
          },
        },
      ],
      { updatePipeline: true },
    )

    console.log(`Updated ${result.modifiedCount} board(s).`)
  } finally {
    await mongoose.disconnect()
  }
}

backfillBoardMembers().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
