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
        // event when a player shows that is ready to play 
        socket.on('playerReady', () => {
            const player = players[socket.id];
            if (!player) return;

            const game = games[player.gameCode];
            if (!game) return;

            console.log(`Player ${player.username} is ready`);

            if (player.color === 'white') {
                game.whiteReady = true;
            } else if (player.color === 'black') {
                game.blackReady = true;
            }

            // if both players are ready, we notify everyone in the game room
            if (game.whiteReady && game.blackReady && !game.gameStarted) {
                console.log('Game ${player.gameCode} starting');
                game.gameStarted = true;
                io.to(player.gameCode).emit('bothPlayersReady');

                // Initialize the timer for each player
                game.timer = setInterval(() => {
                    if (game.turn === 'white') {
                        game.WhiteTime--;
                    } else {
                        game.BlackTime --;
                    }
                
                    // notify all players abot the new time

                    io.to(player.gameCode).emit('timerUpdate', {
                        white: game.WhiteTime,
                        black: game.BlackTime
                    });

                    // verify if a player has no time
                    if (game.WhiteTime <= 0) {
                        clearInterval(game.timer);
                        io.to(player.gameCode).emit('gameOverTime', 'white',{
                            winnerUsername: players[game.black].username
                        })
                    } else if (game.BlackTime <= 0) {
                        clearInterval(game.timer);
                        io.to(player.gameCode).emit('gameOverTime', 'black',{
                            winnerUsername: players[game.white].username
                        })
                    }
                }, 1000);
            }
        
        });

        // Event when a player makes a move
        socket.on('move', (data) => {
            const player = players[socket.id];
            if (!player) {
                console.log('Move rejected: player not found');
                return;
            }

            const game = games[player.gameCode];
            if (!game || !game.gameStarted) {
                console.log('Move rejected: game not found or not started');
                return;
            }
            // we verify if the turn is the player turn
            if (game.turn !== player.color) {
                console.log('Move rejected: not player turn');
                return;
            }
            console.log('Move from ${player.username}: ${data.from} to ${data.to}');

            // we change the turn
            game.turn = game.turn === 'white' ? 'black' : 'white';

            // we notify the move to all players
            io.to(player.gameCode).emit('move', {
                from: data.from,
                to: data.to,
                promotion: data.promotion,
                color: player.color
            })
        })

        // event to manage chat messages
        socket.on('chat', (message) => {
            const player = players[socket.id];
            if (!player) return;

            console.log('chat message from ${player.username}: ${message}');

            // we send the message to all players in the game
            io.to(player.gameCode).emit('chat', {
                username: player.username,
                message: message
            });
        });

        // Envent when a player gets disconnected
        socket.on('disconnect', () => {
            const player = players[socket.id];
            if (player) {
                console.log('Player ${player.username} disconnected from game ${player.gameCode}');

                const game = games[player.gameCode];
                if (game) {
                    if (game.timer) {
                        clearInterval(game.timer);
                    }
                    // we notify all that a player gets disconnected
                    io.to(player.gameCode).emit('gameOverDisconnect', {
                        username: player.username
                    });
                }
                // we delete the player from the list of players
                delete players[socket.id];
            }
        });
        // Event when a player makes checkmate
        socket.on('checkmate', (data) => {
            const player = players[socket.id];
            if (!player) return;

            const game = games[player.gameCode];
            if (!game) return;

            if (game.timer) {
                clearInterval(game.timer);
            }

            // we notify all player that the game ended
            io.to(player.gameCode).emit('gameOver', {
                reason: 'checkmate', 
                winner: data.winner,
                winnerUsername: players[data.winner === 'white' ? game.white : game.black].username
            })
        })

    });
}