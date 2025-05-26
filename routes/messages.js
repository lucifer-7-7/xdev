const express = require('express')
const router = express.Router()
const { isloggedIn, checkChannel, asyncHandler } = require('../lib/middlewares')
const { 
    sendMessage, 
    getConversation, 
    getConversations, 
    getUnreadCount 
} = require('../controllers/messageController')

// Message inbox page
router.get('/', isloggedIn, checkChannel, (req, res) => {
    res.render('devtube', { 
        page: 'messages',
        subPage: 'inbox'
    })
})

// Message conversation page
router.get('/:channelId', isloggedIn, checkChannel, (req, res) => {
    res.render('devtube', { 
        page: 'messages',
        subPage: 'conversation',
        recipientId: req.params.channelId
    })
})

// API Routes
router.post('/send', isloggedIn, checkChannel, asyncHandler(sendMessage))
router.get('/conversation/:channelId', isloggedIn, checkChannel, asyncHandler(getConversation))
router.get('/conversations', isloggedIn, checkChannel, asyncHandler(getConversations))
router.get('/unread', isloggedIn, checkChannel, asyncHandler(getUnreadCount))

module.exports = router 