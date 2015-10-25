var path = require('path');
var express = require('express');

// Server part
var app = express();
app.use('/', express.static(path.join(__dirname, 'public')));

var server = app.listen(8001);
console.log('Server listening on port 8001');

var io = require('socket.io')(server);

var pastPlay = [];

var checkCurrentPlay = function(play) {

  var goodPlay = true;
  for (var i = 0; i < pastPlay.length; i++) {
    if (pastPlay[i] != play[i]) {
      goodPlay = false;
    }
  }

  return goodPlay;

};

io.on('connection', function(socket) {
  console.log('new connection');
  socket.on('sendplay', function(data) {
    console.log('player played ' + data.play);

    if (checkCurrentPlay(data.play)) {
      pastPlay = data.play;
      socket.emit('wrongmove', {msg: 'good move'});

      setTimeout(function() {
        pastPlay.push(Math.floor(Math.random() * 4 + 1));
        socket.emit('receivemove', {play: pastPlay});
      }, 2000);
    } else {
      // wrong move
      pastPlay = [];
      console.log('error');
      socket.emit('wrongmove', {msg: 'wrong move'});
    }

  });

  socket.on('fail', function() {
    pastPlay = [];
  });

});
