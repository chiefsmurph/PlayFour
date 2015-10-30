var pg = require('pg');
var path = require('path');
var express = require('express');


// Server part
var app = express();
app.use('/', express.static(path.join(__dirname, 'dist')));

var server = app.listen(process.env.PORT || 8001);
console.log('Server listening on port ' + (process.env.PORT || 8001));

var io = require('socket.io')(server);
var shortid = require('shortid');
var uuid = require('node-uuid');

var userBank = {};      // userId -> socketId
var topScore = 0;
var waitingForPlayer = null;

var dbFunctions = {
  initTable: function() {
    pg.connect(process.env.DATABASE_URL, function(err, client, done) {
      var query = client.query('CREATE TABLE scores (dbId serial primary key, username VARCHAR(30) not null, score INT, handshake VARCHAR(60))');
      console.log('created scores table');
      query.on('row', function(row) {
        console.log('row: ' + JSON.stringify(row));
      });
      query.on('end', function() {
        done();
      });
    });
  },
  getTopScore: function(cb) {
    pg.connect(process.env.DATABASE_URL + "?ssl=true", function(err, client, done) {
        client.query('SELECT * FROM scores ORDER BY score desc limit 1', function(err, result) {
          done();

          var tScore = result.rows[0].score;
          console.log('gotten top score ' + tScore);
          topScore = tScore;
          cb(tScore);

        });
    });
  },
  createNewUser: function(userId, cb) {

    console.log('creating new user ' + userId);
    // insert
    pg.connect(process.env.DATABASE_URL + "?ssl=true", function(err, client, done) {
      var queryText = 'INSERT INTO scores (username, score, handshake) VALUES($1, $2, $3)';
      client.query(queryText, [userId, 0, ''], function(err, result) {

        done();
        if (err) console.log(err);
        console.log('created new user ' + userId);
        cb();

      });
    });
    // thats all folks
  },
  authorizeScore: function(userId, score, handshake, cb) {
    // select where
    console.log('authorizing ' + userId + ' ' + score + ' ' + handshake);
    pg.connect(process.env.DATABASE_URL + "?ssl=true", function(err, client, done) {
        console.log('err ' + err);
        client.query('SELECT * FROM scores WHERE username=\'' + userId + '\' AND score = ' + score + ' AND handshake = \'' + handshake + '\'', function(err, result) {

          done();
          var authorized = (result.rows.length > 0);
          console.log('userId was authorized: ' + authorized);
          cb(authorized);

        });
    });

    // return true or false
  },
  changeScore: function(userId, increment, cb) {
    // return handshake via callback
    pg.connect(process.env.DATABASE_URL + "?ssl=true", function(err, client, done) {
      client.query('SELECT * FROM scores WHERE username=\'' + userId + '\'', function(err, result) {
        console.log('result rows ' + JSON.stringify(result.rows));
        if (result.rows.length) {
          var curScore = result.rows[0].score;
          var newScore = curScore + increment;
          var handshake = uuid.v1();
          client.query('UPDATE scores SET score = ' + newScore + ', handshake = \'' + handshake + '\' WHERE username=\'' + userId + '\'', function(err, result) {
            cb(newScore, handshake);
            if (curScore === topScore) {
              // if they were previously the reigning champ...
              // update the scoretobeat on all connected clients
              dbFunctions.getTopScore(function(score) {
                topScore = score;
                io.sockets.emit('scoreToBeat', {score: topScore});
              });
            }
            done();
          });

        }
      });
    });

  },
  returnAllUsers: function(cb) {
    pg.connect(process.env.DATABASE_URL + "?ssl=true", function(err, client, done) {
      client.query('SELECT * FROM scores ORDER BY score desc', function(err, result) {
        console.log('got all scores');
        cb(result.rows);
        done();
      });
    });
  }
};

//dbFunctions.initTable();

app.get('/showAllScores', function(req, res, next) {
  dbFunctions.returnAllUsers(function(data) {
    res.json(data);
  });
});

app.get('/reauth', function(req, res, next) {
  res.sendfile(__dirname + '/public/reauth.html');
});

io.on('connection', function(socket) {

  var myUserId = null;
  var mySocketId = socket.id;
  var myOpp = null;

  console.log('new connection: ' + socket.id);

  var sendToOpp = function(event, obj) {
    if (myOpp) {
      io.to(myOpp.socketId).emit(event, obj);
    }
  };

  var returnUserToken = function() {
    return {userId: myUserId, socketId: mySocketId};
  }

  socket.on('newUser', function() {
    setTimeout(function() {
      myUserId = shortid.generate();
      dbFunctions.createNewUser(myUserId, function() {
        console.log('made it to the cb createnewuser');
        socket.emit('welcome', {userId: myUserId});

        dbFunctions.getTopScore(function(score) {
            socket.emit('scoreToBeat', {score: score});
        });
      });
    }, 1800);
  });

  socket.on('authorizeScore', function(data) {
    console.log('user ' + mySocketId + ' sent score: ' + JSON.stringify(data));
    setTimeout(function() {
        // verify the data.userId and data.score and data.handshake
        dbFunctions.authorizeScore(data.userId, data.score, data.handshake, function(response) {
          console.log('made it to the cb authorize');
          socket.emit('authorization', {response: response, userId: data.userId});
          if (response) {
            myUserId = data.userId;
            dbFunctions.getTopScore(function(score) {
                socket.emit('scoreToBeat', {score: score});
            });
          }
        });

    }, 1800);

  });

  socket.on('checkForWaiting', function() {
    if (waitingForPlayer) {
      myOpp = waitingForPlayer;
      sendToOpp('opp', {opp: returnUserToken(), passback: true});
      socket.emit('opp', {opp: myOpp});
      console.log(mySocketId + ' ');
    } else {
      waitingForPlayer = returnUserToken();
      console.log(myUserId + ' waiting for player');
    }
  });

  socket.on('sendClick', function(data) {
    console.log('player played ' + data.play);
    sendToOpp('receiveClick', data);
  });

  socket.on('fail', function(data) {
    console.log('fail data ' + JSON.stringify(data));
    // update db with subtracted score of me
    dbFunctions.changeScore(myUserId, (0-data.round), function(newscore, handshake) {
      socket.emit('updateLocal', { score: newscore, handshake: handshake });
    });
    // update db with added score of my opponent
    dbFunctions.changeScore(myOpp.userId, data.round, function(newscore, handshake) {
      sendToOpp('updateLocal', { score: newscore, handshake: handshake });
    });
    // notify opponent they won
    sendToOpp('winner', {
      move: data.move
    });
  });

  socket.on('opp', function(data) {
    if (!myOpp) {
      myOpp = data.opp;
      waitingForPlayer = null;
      socket.emit('connected', data);
    }
  });

  socket.on('loner', function(data) {

    // update db with added score
    dbFunctions.changeScore(myUserId, data.round, function(newscore, handshake) {
      socket.emit('updateLocal', { score: newscore, handshake: handshake });
    });

    console.log('loner');
    // todo: update db of both winner and loser by data.round
    myOpp = null;
    waitingForPlayer = returnUserToken();
  })

  socket.on('disconnect', function() {
    if (myOpp) {
      sendToOpp('loner');
    } else if (waitingForPlayer && waitingForPlayer.socketId === mySocketId) {
      waitingForPlayer = null;
    }
  });

});
