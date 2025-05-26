const mongoose = require('mongoose');

// Middleware to check the database connection status
const checkDBConnection = (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        return res.status(500).json({ message: 'Database connection error' });
    }
    next();
};

// Middleware to check if a channel is created
const checkChannel = (req, res, next) => {
    if (!req.channel?.uid) {
        // Check if the request is for a messages endpoint expecting JSON
        if (req.path.startsWith('/messages')) {
            return res.status(403).json({ error: 'Channel not created' });
        } else {
            res.redirect('/channel/create');
        }
    } else {
        next();
    }
};

// Middleware to check if a user is logged in
const isloggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    } else {
        // Check if the request is for a messages endpoint expecting JSON
        if (req.path.startsWith('/messages')) {
            return res.status(401).json({ error: 'Unauthorized' });
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
            .catch(next);
    }
}

// Exporting the middleware functions for use in other parts of the application
module.exports = {
    checkDBConnection,
    checkChannel,
    isloggedIn,
    asyncHandler
};
