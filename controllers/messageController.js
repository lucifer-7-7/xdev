const Message = require('../models/Message')
const Channel = require('../models/Channel')
const mongoose = require('mongoose')

// Send a message from one channel to another
const sendMessage = async (req, res) => {
    try {
        const { recipientId, content } = req.body
        const senderId = req.channel.id

        // Check if recipient and sender exist
        const [recipient, sender] = await Promise.all([
            Channel.findById(recipientId),
            Channel.findById(senderId)
        ])

        if (!recipient || !sender) {
            return res.status(404).json({ error: 'Channel not found' })
        }

        // Prevent sending messages to yourself
        if (recipientId === senderId) {
            return res.status(400).json({ error: 'Cannot send messages to yourself' })
        }

        const newMessage = new Message({
            sender: senderId,
            recipient: recipientId,
            content
        })

        await newMessage.save()
        res.status(201).json(newMessage)
    } catch (error) {
        console.error('Error sending message:', error)
        res.status(500).json({ error: 'Server error' })
    }
}

// Get conversation between two channels
const getConversation = async (req, res) => {
    try {
        const { channelId } = req.params
        const currentChannelId = req.channel.id

        // Mark messages as read when fetching
        await Message.updateMany(
            { sender: channelId, recipient: currentChannelId, read: false },
            { read: true }
        )

        // Get messages between the two channels
        const messages = await Message.find({
            $or: [
                { sender: currentChannelId, recipient: channelId },
                { sender: channelId, recipient: currentChannelId }
            ]
        })
            .sort({ sentAt: 1 })
            .populate('sender', 'name handle logoURL')
            .populate('recipient', 'name handle logoURL')

        res.status(200).json(messages)
    } catch (error) {
        console.error('Error getting conversation:', error)
        res.status(500).json({ error: 'Server error' })
    }
}

// Get all conversations for the current channel
const getConversations = async (req, res) => {
    try {
        const channelId = req.channel.id

        // Find the most recent message for each conversation
        const conversations = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { sender: mongoose.Types.ObjectId(channelId) },
                        { recipient: mongoose.Types.ObjectId(channelId) }
                    ]
                }
            },
            {
                $sort: { sentAt: -1 }
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ["$sender", mongoose.Types.ObjectId(channelId)] },
                            "$recipient",
                            "$sender"
                        ]
                    },
                    lastMessage: { $first: "$$ROOT" },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                { $and: [
                                    { $eq: ["$recipient", mongoose.Types.ObjectId(channelId)] },
                                    { $eq: ["$read", false] }
                                ]},
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ])

        // Get channel details for each conversation
        const populatedConversations = await Channel.populate(conversations, {
            path: '_id',
            select: 'name handle logoURL'
        })

        res.status(200).json(populatedConversations)
    } catch (error) {
        console.error('Error getting conversations:', error)
        res.status(500).json({ error: 'Server error' })
    }
}

// Get unread messages count
const getUnreadCount = async (req, res) => {
    try {
        const channelId = req.channel.id

        const unreadCount = await Message.countDocuments({
            recipient: channelId,
            read: false
        })

        res.status(200).json({ unreadCount })
    } catch (error) {
        console.error('Error getting unread count:', error)
        res.status(500).json({ error: 'Server error' })
    }
}

module.exports = {
    sendMessage,
    getConversation,
    getConversations,
    getUnreadCount
} 