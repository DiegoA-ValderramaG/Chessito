// Game state variables
let gameHasStarted = false;
let gameOver = false;
let board = null;
let game = new Chess();

// DOM elements
const $status = $('#status');
const $pgn = $('#pgn');

function initGame() {
    const config = {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    };

    board = Chessboard('myBoard', config);

    if (playerColor === 'black') {
        board.flip();
    }

    socket.emit('joinGame', {
        code: gameCode,
        color: playerColor,
        timeControl: timeControl,
        username: playerUsername
    });

    console.log('Game initialized', {
        color: playerColor,
        code: gameCode,
        timeControl: timeControl,
        username: playerUsername
    });
}

socket.on('playersConnected', function (data) {
    console.log('Players connected', data);
    $status.text(`Both players connected: ${data.white} vs ${data.black}. Click Ready when you are ready to start.`);
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
            promotion: moveData.promotion || 'q'
        };
        game.move(move);
        board.position(game.fen());
        updateStatus();
    }
});

socket.on('gameOver', function (data) {
    gameOver = true;
    $status.text('Game Over');
});

function onDragStart(source, piece, position, orientation) {
    if (gameOver || game.game_over()) return false;
    if (!gameHasStarted) return false;

    if (playerColor === 'white' && piece.search(/^b/) !== -1) return false;
    if (playerColor === 'black' && piece.search(/^w/) !== -1) return false;

    if ((game.turn() === 'w' && playerColor !== 'white') ||
        (game.turn() === 'b' && playerColor !== 'black')) {
        return false;
    }
    return true;
}

function onDrop(source, target) {
    const move = game.move({
        from: source,
        to: target,
        promotion: 'q'
    });

    if (move === null) return 'snapback';

    socket.emit('move', {
        from: source,
        to: target,
        promotion: 'q'
    });

    updateStatus();
}

function onSnapEnd() {
    board.position(game.fen());
}

function updateStatus() {
    let status = '';
    let moveColor = game.turn() === 'b' ? 'Black' : 'White';

    if (game.in_checkmate()) {
        status = `Game over, ${moveColor} is in checkmate.`;
        socket.emit('checkmate', {
            winner: game.turn() === 'b' ? 'white' : 'black'
        });
        gameOver = true;
    } else if (game.in_draw()) {
        status = 'Game over, it is a draw.';
        socket.emit('draw');
        gameOver = true;
    } else {
        status = `${moveColor} to move.`;
        if (game.in_check()) {
            status += ` ${moveColor} is in check.`;
        }
    }

    $status.text(status);
    $pgn.text(game.pgn());
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (message) {
        socket.emit('chat', message);
        input.value = '';
    }
}

document.getElementById('chatInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
});

socket.on('chat', function (data) {
    const chatMessages = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');

    messageElement.className = 'chat-message';

    messageElement.textContent = `${data.username}: ${data.message}`;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

socket.on('updateTimers', function (data) {
    document.getElementById('whiteTimer').textContent = formatTime(data.whiteTime);
    document.getElementById('blackTimer').textContent = formatTime(data.blackTime);
});

$('#readyButton').on('click', function () {
    socket.emit('playerReady');
    $(this).prop('disabled', true).text('Waiting for opponent...');
});

$(document).ready(function () {
    initGame();
});
