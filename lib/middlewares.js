const mongoose = require('mongoose');

// Middleware to check the database connection status
const checkDBConnection = (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        console.error('Database connection error. Current state:', mongoose.connection.readyState);
        return res.status(500).json({ message: 'Database connection error' });
    }
    next();
};

// Middleware to check if a channel is created
const checkChannel = (req, res, next) => {
    // Log authentication status
    console.log('Check channel middleware. User authenticated:', req.isAuthenticated());
    console.log('Channel info:', req.channel ? { id: req.channel.id, name: req.channel.name } : 'No channel');
    
    if (!req.channel?.id) {
        console.log('Channel not created or missing ID for user:', req.user?.id);
        // Check if the request is for an API endpoint expecting JSON
        if (req.path.startsWith('/messages') && req.path !== '/messages' && req.path !== '/messages/') {
            return res.status(403).json({ error: 'Channel not created or unauthorized' });
        } else {
            res.redirect('/channel/create');
        }
    } else {
        next();
    }
};

// Middleware to check if a user is logged in
const isloggedIn = (req, res, next) => {
    console.log('Is logged in middleware. Auth status:', req.isAuthenticated());
    
    if (req.isAuthenticated()) {
        console.log('User authenticated:', req.user?.id);
        return next();
    } else {
        console.log('User not authenticated, redirecting');
        // Check if the request is for an API endpoint expecting JSON
        if (req.path.startsWith('/messages') && req.path !== '/messages' && req.path !== '/messages/') {
            return res.status(401).json({ error: 'Unauthorized - Please log in' });
        } else {
            res.redirect('/');
        }
    }
};

// Utility function to handle async errors in middleware
function asyncHandler(fn) {
    return function (req, res, next) {
        return Promise
            .resolve(fn(req, res, next))
            .catch((error) => {
                console.error(`Async error in ${fn.name || 'unnamed handler'}:`, error);
                // Pass the error to the next middleware
                next(error);
            });
    }
}

// Exporting the middleware functions for use in other parts of the application
module.exports = {
    checkDBConnection,
    checkChannel,
    isloggedIn,
    asyncHandler
};
