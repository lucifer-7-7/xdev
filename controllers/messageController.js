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
        const { channelId } = req.params;
        const currentChannelId = req.channel.id;
        
        // Validate channel ID format
        if (!mongoose.Types.ObjectId.isValid(channelId)) {
            return res.status(400).json({ error: 'Invalid channel ID format' });
        }

        // Mark messages as read when fetching
        await Message.updateMany(
            { 
                sender: channelId, 
                recipient: currentChannelId, 
                read: false 
            },
            { read: true }
        );

        // Get messages between the two channels
        const messages = await Message.find({
            $or: [
                { sender: currentChannelId, recipient: channelId },
                { sender: channelId, recipient: currentChannelId }
            ]
        })
            .sort({ sentAt: 1 })
            .populate('sender', 'name handle logoURL')
            .populate('recipient', 'name handle logoURL');

        res.status(200).json(messages);
    } catch (error) {
        console.error('Error getting conversation:', error);
        res.status(500).json({ error: 'Server error', message: error.message });
    }
}

// Get all conversations for the current channel
const getConversations = async (req, res) => {
    try {
        // Log the user and channel making the request
        console.log('Getting conversations for channel:', req.channel.id, req.channel.name);
        
        const channelId = new mongoose.Types.ObjectId(req.channel.id);

        // Find the most recent message for each conversation
        const conversations = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { sender: channelId },
                        { recipient: channelId }
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
                            { $eq: ["$sender", channelId] },
                            "$recipient",
                            "$sender"
                        ]
                    },
                    lastMessage: { $first: "$$ROOT" },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                { 
                                    $and: [
                                        { $eq: ["$recipient", channelId] },
                                        { $eq: ["$read", false] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {
                $sort: { "lastMessage.sentAt": -1 }
            }
        ]);
        
        console.log('Found raw conversations:', conversations.length);
        
        // If no conversations were found, return an empty array
        if (!conversations || conversations.length === 0) {
            console.log('No conversations found for channel:', req.channel.id);
            return res.status(200).json([]);
        }

        // Get channel details for each conversation
        const populatedConversations = await Channel.populate(conversations, {
            path: '_id',
            select: 'name handle logoURL'
        });
        
        console.log('Populated conversations:', populatedConversations.length);

        // Ensure consistent structure and filter out invalid conversations
        const validConversations = populatedConversations
            .filter(conv => {
                if (!conv._id || !conv._id.name) {
                    console.log('Filtering out invalid conversation:', conv);
                    return false;
                }
                return true;
            })
            .map(conv => {
                // Format conversation object to ensure consistent structure
                return {
                    _id: {
                        _id: conv._id._id || conv._id,
                        name: conv._id.name,
                        handle: conv._id.handle,
                        logoURL: conv._id.logoURL || '/img/default-channel-logo.png'
                    },
                    lastMessage: {
                        content: conv.lastMessage.content,
                        sentAt: conv.lastMessage.sentAt,
                        read: conv.lastMessage.read
                    },
                    unreadCount: conv.unreadCount
                };
            });
        
        console.log('Valid conversations to return:', validConversations.length);
        
        // Return the results
        res.status(200).json(validConversations);
    } catch (error) {
        console.error('Error getting conversations:', error);
        // Return a more detailed error message
        res.status(500).json({ 
            error: 'Server error', 
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
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