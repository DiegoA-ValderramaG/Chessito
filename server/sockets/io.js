const games = {};

const players = {};

module.exports = function(io) {
    io.on('connection', (socket) => {
        console.log('New client connected');

        // envent when a player tries to join a game
        socket.on('joinGame', (data) => {
            const {code, color, timeControl, username} = data;
            console.log(`Player ${username} joining game ${code} as ${color}`);

            // if the game doesn't exist, create it with initial values
            if (!games[code]) {
                games[code] = {
                    white: null,
                    black: null,
                    timeControl: timeControl,
                    whiteReady: false,
                    blackReady: false,
                    gameStarted: false,
                    WhiteTime: timeControl * 60,
                    BlackTime: timeControl * 60,
                    turn: 'white',
                    moves: []
                };
            }

            // save the information about the player in the players object
            players[socket.id] = {
                username: username,
                gameCode: code,
                color: color
            };
            // payers join the game room with the game code
            socket.join(code);

            // we assign the player to the game color
            if (color === 'white') {
                games[code].white = socket.id;
            } else if (color === 'black') {
                games[code].black = socket.id;
            }

            // if both players are connected, we notify everyone in the game room
            if (games[code].white && games[code].black) {
                console.log(`Game ${code} is ready to start`);

                io.to(code).emit('gameReady', {
                    white: players[games[code].white].username,
                    black: players[games[code].black].username
                });
            }

        })
    });
}