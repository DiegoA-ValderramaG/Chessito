const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../database/db');

// Register new user
router.post('/register', async (req, res) => {
    console.log('Registering user:', req.body);

    try {
        const { username, email, password } = req.body;

        // basic validation
        if (!username || !email || !password) {
            console.log('Validation failed: Missing fields');
            return res.status(400).json({ 
                success: false,
                message: 'All fields are required'
            });
        }

        // Check if user already exists
        const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            console.log('Error: User already exists');
            return res.status(400).json({ 
                success: false,
                message: 'User already exists'
            });
        }

        // Hash the password
        console.log('Generating password hash...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        console.log('Password hash generated');

        // Insert new user into database
        console.log('Inserting new user into database...');
        const result = await db.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id',
            [username, email, hashedPassword]
        );
        console.log('User inserted with ID:', result.rows[0].id);
        res.json({ 
            success: true,
            message: 'User registered successfully' 
        });
    } catch (error) {
        console.error('Error registering user:', {
            error: error.message, 
            code: error.code, 
            detail: error.detail, 
            table: error.table, 
            constraint: error.constraint
        });
        // handle specific database errors 
        if (error.code === '23505') {
            console.log('Error: User already exists');
            return res.status(400).json({ 
                success: false,
                message: 'User already exists'
            });
        } else {
            console.log('Error: Registration failed');
            res.status(500).json({ 
                success: false,
                message: 'Registration failed'
            });
        }
    }
});

// login user 
router.post('/login', async (req, res) => {
    console.log('Login attempt:', {username: req.body.username});

    try{
        const { username, password } = req.body;

        // basic validation
        if (!username || !password) {
            console.log('Validation failed: Missing fields');
            return res.status(400).json({ 
                success: false,
                message: 'Username and password are required'
            });
        }

        //Find user by username
        console.log('Searching user in database...');
        const result = await db.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );
        const user = result.rows[0];

        if (!user) {
            console.log('Error: User not found');
            return res.status(400).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        // verify password
        console.log('Verifying password...');
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            console.log('Error: Incorrect password');
            return res.status(400).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        // Update last_login
        console.log('Updating last login time...');
        await db.query(
            'UPDATE users SET last_login = NOW() WHERE id = $1',
            [user.id]
        );  
        // Set session 
        req.session.userId = user.id;
        console.log('login successful:', {username: user.username,id: user.id});
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            },
            message: 'Login successful'
        });
    } catch (error) {
        console.error('Error logging in:', {
            error: error.message,
            code: error.code,
            detail: error.detail,
            table: error.table,
            constraint: error.constraint
        });
        res.status(500).json({
            success: false,
            message: 'Error logging in. Please try again later.'
        });
    }
});

// logout user
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error logging out:', err);
            return res.status(500).json({
                success: false,
                message: 'Error logging out. Please try again later.'
            });
        } 
            console.log('Logout successful');
            res.json({
                success: true,
                message: 'Logout successful'
            });
    });
});

// get current user
router.get('/me', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized'
        });
    }
    try {
        const result = await db.query(
            'SELECT id, username, email FROM users WHERE id = $1',
            [req.session.userId]
        );
        if (!result.rows[0]) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });

            } catch (error) {
                console.error('Error fetching user:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error fetching user. Please try again later.'
                });
            }

});

module.exports = router;