const express = require('express')
const router = express.Router()
const { isloggedIn, checkChannel, asyncHandler } = require('../lib/middlewares')
const { 
    sendMessage, 
    getConversation, 
    getConversations, 
    getUnreadCount 
} = require('../controllers/messageController')

// Check authentication status
router.get('/auth-status', (req, res) => {
    res.json({
        authenticated: req.isAuthenticated(),
        hasChannel: !!req.channel?.id,
        userId: req.user?.id || null,
        channelId: req.channel?.id || null
    })
})

// Message inbox page
router.get('/', isloggedIn, checkChannel, (req, res) => {
    res.render('devtube', { 
        page: 'messages',
        subPage: 'inbox'
    })
})

// API Routes
router.post('/send', isloggedIn, checkChannel, asyncHandler(sendMessage))
router.get('/unread', isloggedIn, checkChannel, asyncHandler(getUnreadCount))
router.get('/conversations', isloggedIn, checkChannel, asyncHandler(getConversations))

// Message conversation page - must be after other routes to prevent route conflicts
router.get('/:channelId', isloggedIn, checkChannel, (req, res, next) => {
    // Only proceed if channelId looks like a valid MongoDB ObjectId
    if (/^[0-9a-fA-F]{24}$/.test(req.params.channelId)) {
        return res.render('devtube', { 
            page: 'messages',
            subPage: 'conversation',
            recipientId: req.params.channelId
        });
    }
    // If not a valid ObjectId, pass to next route or 404
    next();
});

// Conversation API - should be after all other specific routes
router.get('/conversation/:channelId', isloggedIn, checkChannel, (req, res, next) => {
    // Only proceed if channelId looks like a valid MongoDB ObjectId
    if (/^[0-9a-fA-F]{24}$/.test(req.params.channelId)) {
        return asyncHandler(getConversation)(req, res, next);
    }
    // If not a valid ObjectId, return 400 Bad Request
    return res.status(400).json({ error: 'Invalid channel ID format' });
});

// 404 handler for messages routes
router.use((req, res) => {
    res.status(404).json({ error: 'Message endpoint not found' });
});

module.exports = router 