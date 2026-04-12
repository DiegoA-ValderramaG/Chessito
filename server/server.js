// importaciones
const express = require('express');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const path = require('path');
const io = require('socket.io')(http);

const http = require('http'),
    express = require('express'),
    session = require('express-session'),
    pgSession = require('connect-pg-simple')(session),
    socketIo = require('socket.io');

    const config = require('../config');
    const { Pool } = require('./database/db');
    const { requireAuth, setUserData } = require('./middleware/authMiddleware');
    const authRoutes = require('./routes/auth');

    const myIo = require('./socket/io'),
          routes = require('./routes/routes');

    const app = express();
          server = http.Server(app),
          io = socketIo(server);
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session settings
app.use(session({
    store: new pgSession({
        pool,
        tableName: 'session',
        // clean expired session
        pruneSessionInterval: 60
}),
    secret: process.env.SESSION_SECRET || 'your_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: false,
        rolling: true,
        maxAge: 3 * 60 * 1000
    }
}));
//  Server static files
app.use('/public', express.static(path.join(__dirname, '../front/public')));
app.use(express.static(path.join(__dirname, '..', 'front')));
app.use(setUserData); // Middleware para establecer datos del usuario en req.user

// Rutas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../front/views/index.html'));
});
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../front/views/login.html'));
});
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../front/views/register.html'));
});

// View configuration
app.set('views', path.join(__dirname, '../front/views'));
app.set('view engine', 'html');
app.engine('html', require('express-handlebars').engine({ 
    extname: 'html' ,
    defaultLayout: false,
    helpers: {
        json: function(context) {
            return JSON.stringify(context);
        }
    }
}));


// Public routes
app.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('login');
});

app.get('/register', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('register');
});

// protected main route
app.get('/', requireAuth, (req, res) => {
    res.render('index', { user: res.locals.user });
});

// game routes
app.use('/game', requireAuth, routes);

// Socket.io configuration
myIo(io);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error', err);
    res.status(500).json({ 
        sucess: false,
        message: 'Internal Server Error'
    });
});

// Port Settings and server start
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
