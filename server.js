var path = require('path');
var express = require('express');

// Server part
var app = express();
app.use('/', express.static(path.join(__dirname, 'public')));

var server = app.listen(process.env.PORT || 8001);
console.log('Server listening on port ' + (process.env.PORT || 8001));

var io = require('socket.io')(server);
var uuid = require('node-uuid');

var userBank = {};      // userId -> socketId
var waitingForPlayer = null;


io.on('connection', function(socket) {

  var myId = socket.id;
  var myOpp = null;

  console.log('new connection: ' + socket.id);

  var sendToOpp = function(event, obj) {
    if (myOpp) {
      io.to(myOpp).emit(event, obj);
    }
  };

  socket.on('newUser', function() {
    setTimeout(function() {
      socket.emit('welcome');
    }, 1800);
  });

  socket.on('authorizeScore', function(data) {
    console.log('user ' + myId + ' sent score: ' + data);
    socket.emit('authorization', true);
  });

  socket.on('checkForWaiting', function() {
    if (waitingForPlayer) {
      myOpp = waitingForPlayer;
      sendToOpp('opp', {opp: myId, passback: true});
      socket.emit('opp', {opp: myOpp});
      console.log(myId + ' ');
    } else {
      waitingForPlayer = socket.id;
      socket.emit('waiting');
      console.log(myId + ' waiting for player');
    }
  });

  socket.on('sendClick', function(data) {
    console.log('player played ' + data.play);
    sendToOpp('receiveClick', data);
  });

  socket.on('fail', function(data) {
    sendToOpp('winner', {
        move: data.move,
        id: myOpp
    });
  });

  socket.on('opp', function(data) {
    if (!myOpp) {
      myOpp = data.opp;
      waitingForPlayer = null;
      socket.emit('connected', data);
    }
  });

  socket.on('loner', function() {
    console.log('loner');
    myOpp = null;
    waitingForPlayer = myId;
  })

  socket.on('disconnect', function() {
    if (myOpp) {
      sendToOpp('loner');
    } else if (waitingForPlayer === myId) {
      waitingForPlayer = null;
    }
  });

});
