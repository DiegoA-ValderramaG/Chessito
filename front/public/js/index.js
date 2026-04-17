// Game state variables
let gameHasStarted = false;
let gameOver = false;
let board = null;
let game = new Chess();

// DOM elements
const $status = $('#status');
const $pgn = $('#pgn');

// Initialize the chess game
function intGame() {

    // Initialize the board with configuration
    const config = {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    };

    board = Chessboard('myBoard', config);

    // flip board if player is black 
    if (playerColor === 'black') {
        board.flip();
    }

    // join the game room
    socket.emit('joinGame', {
        code: gameCode,
        color: playerColor,
        timeControl: timeControl,
        username: username
    });
    console.log('Game initalized', {
        color: playerColor,
        code: gameCode,
        timeControl: timeControl,
        username: username
    });
}

// Socket event handlers
socket.on('playersConnected', function (data) {
    console.log('Players connected', data);
    $status.text(`Both players connected: ${data.white} vs ${data.black}). Click Ready when you are ready to start.`);
    $('#readyButton').prop('disabled', false);
});

socket.on('bothPlayersReady', function () {
    console.log('Both players are ready. Starting game.');
    gameHasStarted = true;
    $status.text(`Game started! ${playerColor === 'white' ? 'You play white' : 'You play black'}`);
    $('#readyButton').text('Game in progress').prop('disabled', true);
});
socket.on('move', function (moveData) {
    console.log('Move received', moveData);

    if (moveData.color !== playerColor) {
        const move = {
            from: moveData.from,
            to: moveData.to,
            promotion: moveData.promotion || 'q' // default to queen promotion
        }
        game.move(move);
        board.position(game.fen());
        updateStatus();
    }
});

socket.on('gameOver', function (data) {
    gameOver = true;
    $status.text('Game Over').prop('disabled', true);
});

// Check if a piece can be moved
function onDragStart(source, piece, position, orientation) {
    // Do not pick up pieces if the game is over
    if (gameOver || game.game_over()) return false;

    // Only pick up pieces for the current player
    if (!gameHasStated) return false;

    // Only pick up pieces for White is they are white
    if (playerColor === 'white' && piece.search(/^b/) !== -1) return false;

    // Only pick up pieces for Black is they are black
    if (playerColor === 'black' && piece.search(/^w/) !== -1) return false;

    // Only pick up if it's the player's turn
    if ((game.turn() === 'w' && playerColor !== 'white') || 
        (game.turn() === 'b' && playerColor !== 'black')) {
        return false;
    }
    return true;
}

// Handle piece drop on the board
function onDrop(source, target) {
    const move = game.move({
        from: source,
        to: target,
        promotion: 'q' // default to queen promotion
    });

    // if illegal move, snap back
    if (move === null) return 'snapback';

    // emit the move to other player
    socket.emit ('move', {
        from: source,
        to: target,
        promotion: 'q'
    });

    updateStatus();
}

// Update board position after piece snap
function onSnapEnd() {
    board.position(game.fen());
}

// Update game status
function updateStatus() {
    let status = '';
    let moveColor = game.turn() === 'b' ? 'Black' : 'White';

    // Checkmate?
    if (game.in_checkmate()) {
        status = `Game over, ${moveColor} is in checkmate.`;

        socket.emit('checkmate', {
            winner: game.turn() === 'b' ? 'white' : 'black'
        });
        gameOver = true;
    }

    // Draw?

    else if (game.in_draw()) {
        status = 'Game over, it is a draw.';
        socket.emit('draw');
        gameOver = true;
    }

    // Game still on 
    else {
        status = `${moveColor} to move.`;
        // Check?
        if (game.in_check()) {
            status += `, ${moveColor} is in check.`;
        }
    }
    $status.text(status);
    $pgn.text(game.pgn());

    //Initialize game when page loads
    $(document).ready(function () {
        initGame();

    });

    //Chat functionality
    function sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.ariaValueMax.trim();

        if (message) {
            socket.emit('chatMessage', {
                message: message,
                username: playerUsername
            });
            input.value = '';
        }
    }

    // Handle enter key in chat input
    document.getElementById('chatInput').addEventListener('keypress', function (e){
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Handle chat messages
    socket.on('chatMessage', function (data){
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.textContent = `${data.username}: ${data.message}`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; 
    });

    // timer functionality
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // Update timers
    socket.on('updateTimers', function (data) {
        document.getElementById('whiteTimer').textContent = formatTime(data.whiteTime);
        document.getElementById('blackTimer').textContent = formatTime(data.blackTime);
    });

    // Ready button handler
    document.getElementById('readyButton').addEventListener('click', function (){
        socket.emit('playerReady');
            this.disabled = true;
            this.textContent = 'waiting for opponent...';  
    });

    // Join game room if code is provided in URL
    let urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('code')) {
        socket.emit('joinGame', {
            code: urlParams.get('code'),
        })
    }
}
