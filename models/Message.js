const mongoose = require("mongoose")
const { Schema } = mongoose

const MessageSchema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: "Channel", required: true },
  recipient: { type: Schema.Types.ObjectId, ref: "Channel", required: true },
  content: { type: String, required: true, trim: true },
  read: { type: Boolean, default: false },
  sentAt: { type: Date, default: Date.now }
})

// Create compound index for efficient querying of conversations
MessageSchema.index({ sender: 1, recipient: 1 })
MessageSchema.index({ recipient: 1, read: 1 }) // For unread messages

const Message = mongoose.model("Message", MessageSchema)

module.exports = Message 