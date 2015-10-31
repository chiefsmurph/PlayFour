var pg = require('pg');
var path = require('path');
var express = require('express');
var geoip = require('geoip-lite');

// Server part
var app = express();
app.use('/', express.static(path.join(__dirname, 'dist')));

var server = app.listen(process.env.PORT || 8001);
console.log('Server listening on port ' + (process.env.PORT || 8001));

var io = require('socket.io')(server);
var shortid = require('shortid');
var uuid = require('node-uuid');

var connectedUsers = {};
var topScore = 0;
var waitingForPlayer = null;

function getCurrentTimestamp() {

    var date = new Date();
    var ampm = "";

    var hour = date.getHours();
    if (hour > 12) {
      ampm = "pm";
      hour = hour - 12;
    } else {
      ampm = "am";
    }

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return month + "/" + day + "/" + year + ' ' + hour + ':' + min + ampm;

}

var dbFunctions = {
  executeQuery: function(q) {
    pg.connect(process.env.DATABASE_URL, function(err, client, done) {
      //CREATE TABLE scores (dbId serial primary key, username VARCHAR(30) not null, score INT, handshake VARCHAR(60))
      var query = client.query(q);
      console.log('executed query ' + q);
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
  },
  hasAnsweredRequest: function(userId, cb) {
    pg.connect(process.env.DATABASE_URL + "?ssl=true", function(err, client, done) {
        client.query('SELECT * FROM scores WHERE username = \'' + userId + '\'', function(err, result) {
          done();

          var dbRow = result.rows[0];
          var answered = dbRow.paypalemail || dbRow.address;
          cb(answered);

        });
    });
  },
  savePreferences: function(userId, preferences) {
    pg.connect(process.env.DATABASE_URL + "?ssl=true", function(err, client, done) {
      client.query('UPDATE scores SET contactemail = \'' + preferences.contactEmail + '\', paypalemail = \'' + preferences.paypalEmail + '\', address = \'' + preferences.address + '\' WHERE username=\'' + userId + '\'', function(err, result) {
        done();
      });
    });
  }
};

//dbFunctions.executeQuery('CREATE TABLE visitlogs (visitId serial primary key, username VARCHAR(30) not null, ip VARCHAR(30) not null, datetime VARCHAR(30) not null, arrscore INT, leavescore INT, duration INT, gamesWon INT, gamesLost INT )');
//dbFunctions.executeQuery('CREATE TABLE visitlogs (visitId serial primary key, username VARCHAR(30) not null, ip VARCHAR(30) not null, datetime VARCHAR(30) not null, arrscore INT, leavescore INT, duration INT, gamesWon INT, gamesLost INT )');
//dbFunctions.executeQuery('CREATE TABLE gamelogs (gameId serial primary key, datetime VARCHAR(30) not null, winnerId VARCHAR(30) not null, loserId VARCHAR(30) not null, round INT )');
//CREATE TABLE generalLogs (errorId serial primary key, datetime VARCHAR(30) not null, error VARCHAR(120) not null)

visitLogFunctions = {
  logNewVisit: function(userId, ip, arrScore, cb) {
    ip = ip || "-- error --";

    console.log('creating new visit ' + userId);
    pg.connect(process.env.DATABASE_URL + "?ssl=true", function(err, client, done) {
      var curDateTime = getCurrentTimestamp();
      var queryText = 'INSERT INTO visitlogs (username, ip, datetime, arrscore) VALUES($1, $2, $3, $4) RETURNING visitid';
      client.query(queryText, [userId, ip, curDateTime, arrScore], function(err, result) {

        done();
        if (err) console.log(err);
        console.log('created new log visit' + JSON.stringify(result));
        cb(result.rows[0].visitid);   // pass the visitid back

      });
    });
  },
  closeOutVisit: function(visitId, leaveScore, duration, gamesWon, gamesLost) {
    pg.connect(process.env.DATABASE_URL + "?ssl=true", function(err, client, done) {
      client.query('UPDATE visitlogs SET leaveScore = ' + leaveScore + ', duration = ' + duration + ', gameswon = ' + gamesWon + ', gameslost = ' + gamesLost + ' WHERE visitid=' + visitId, function(err, result) {
        done();
        if (err) console.log(err);
        console.log('closed out visit' + JSON.stringify(result));
      });
    });
  }
};

generalLogFunctions = {
  logMessage: function(text) {
    pg.connect(process.env.DATABASE_URL + "?ssl=true", function(err, client, done) {
      var curDateTime = getCurrentTimestamp();
      var queryText = 'INSERT INTO generalLogs (datetime, log) VALUES($1, $2)';
      client.query(queryText, [curDateTime, text], function(err, result) {

        done();
        if (err) console.log(err);

      });
    });
  }
};

gameLogFunctions = {
  logGame: function(winnerId, loserId, round) {
    pg.connect(process.env.DATABASE_URL + "?ssl=true", function(err, client, done) {
      var curDateTime = getCurrentTimestamp();
      var queryText = 'INSERT INTO gamelogs (datetime, winnerId, loserId, round) VALUES($1, $2, $3, $4)';
      client.query(queryText, [curDateTime, winnerId, loserId, round], function(err, result) {

        done();
        if (err) console.log(err);

      });
    });
  }
}

app.get('/showAllScores', function(req, res, next) {
  dbFunctions.returnAllUsers(function(data) {
    res.json(data);
  });
});

app.get('/reauth', function(req, res, next) {
  res.sendfile(__dirname + '/public/reauth.html');
});

app.get('/js/mozilla-cookies.js', function(req, res, next) {
  res.sendfile(__dirname + '/public/js/mozilla-cookies.js');
});

io.on('connection', function(socket) {
  var clientIp = socket.handshake.headers['x-forwarded-for'];

  var myUserId = null;
  var mySocketId = socket.id;
  var myOpp = null;

  // visit
  var startTime = Math.floor(Date.now() / 1000);
  var visitId;

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

    var geo = geoip.lookup(clientIp);
    var loc = geo.city + ', ' + geo.region + ' (' + geo.country + ')';

    setTimeout(function() {
      myUserId = shortid.generate();
      connectedUsers[myUserId] = {socketId: mySocketId, score: 0, ip: clientIp, gamesWon: 0, gamesLost: 0};
      dbFunctions.createNewUser(myUserId, function() {
        console.log('made it to the cb createnewuser');
        socket.emit('welcome', {userId: myUserId});

        dbFunctions.getTopScore(function(score) {
            socket.emit('scoreToBeat', {score: score});
        });

        visitLogFunctions.logNewVisit(myUserId, clientIp, 0, function(vid) {
          visitId = vid;
        });

        generalLogFunctions.logMessage('new user (' + myUserId + ') (' + clientIp + ') from ' + loc);
      });
    }, 1800);
  });

  socket.on('authorizeScore', function(data) {
    console.log('user ' + mySocketId + ' sent score: ' + JSON.stringify(data));

    var geo = geoip.lookup(clientIp);
    var loc = geo.city + ', ' + geo.region + ' (' + geo.country + ')';

    setTimeout(function() {

      if (!connectedUsers[data.userId]) { // if userid not already logged in
        // verify the data.userId and data.score and data.handshake
        dbFunctions.authorizeScore(data.userId, data.score, data.handshake, function(authorized) {
          console.log('made it to the cb authorize');

          if (authorized) {
            myUserId = data.userId;
            connectedUsers[myUserId] = {score: data.score, socketId: mySocketId, ip: clientIp, gamesWon: 0, gamesLost: 0};
            visitLogFunctions.logNewVisit(myUserId, clientIp, data.score, function(vid) {
              visitId = vid;
            });

            if (data.score / 0.75 > topScore) {
              dbFunctions.hasAnsweredRequest(myUserId, function(bool) {
                if (bool) {
                  // within striking distance and already submitted paypal or cash info
                  socket.emit('authorization', {response: true, userId: myUserId});
                } else {
                  // within striking distance and have not submitted the info
                  socket.emit('authorization', {response: true, userId: myUserId, requestContact: true});
                }
              });
            } else {
              // not within striking distance and it doesnt matter if they have or have not submitted the info
              socket.emit('authorization', {response: true, userId: myUserId});
            }

            dbFunctions.getTopScore(function(score) {
                socket.emit('scoreToBeat', {score: score});
            });

            generalLogFunctions.logMessage('returning user (' + myUserId + ') (' + clientIp + ') logged in from ' + loc);

          } else {
            socket.emit('authorization', {response: false});
          }

        });
      } else {
        // user already logged in
        socket.emit('authorization', {response: false});
      }
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
    dbFunctions.changeScore(myUserId, (0-(data.round/2)), function(newscore, handshake) {
      connectedUsers[myUserId].score = newscore;
      connectedUsers[myUserId].gamesLost++;
      socket.emit('updateLocal', { score: newscore, handshake: handshake });
    });

    // update db with added score of my opponent
    dbFunctions.changeScore(myOpp.userId, data.round, function(newscore, handshake) {
      connectedUsers[myOpp.userId].score = newscore;
      connectedUsers[myOpp.userId].gamesWon++;
      sendToOpp('updateLocal', { score: newscore, handshake: handshake });
    });

    // notify opponent they won
    sendToOpp('winner', {
      move: data.move
    });

    gameLogFunctions.logGame(myOpp.userId, myUserId, data.round);
  });

  socket.on('opp', function(data) {
    if (!myOpp) {
      myOpp = data.opp;
      waitingForPlayer = null;
      socket.emit('connected', data);
    }
  });

  socket.on('loner', function(data) {

    if (data.round > 0) {
      // update db with added score
      dbFunctions.changeScore(myUserId, data.round, function(newscore, handshake) {
        connectedUsers[myUserId].score = newscore;
        socket.emit('updateLocal', { score: newscore, handshake: handshake });
      });
      generalLogFunctions.logMessage(myOpp.userId + ' left in middle of game against ' + myUserId + ' (round: ' + data.round + ' )');
    }
    console.log('loner');
    // todo: update db of both winner and loser by data.round
    myOpp = null;
    waitingForPlayer = returnUserToken();
  });

  socket.on('sendPreferences', function(data) {
    // synch because
    dbFunctions.savePreferences(myUserId, data);
    generalLogFunctions.logMessage(myUserId + ' sent payment preferences: ' + JSON.stringify(data));
  });

  socket.on('disconnect', function() {
    if (myOpp) {
      sendToOpp('loner');
    } else if (waitingForPlayer && waitingForPlayer.socketId === mySocketId) {
      waitingForPlayer = null;
    }
    console.log('here disconnect')
    if (visitId && connectedUsers[myUserId]) {  // should be if authorized or new user'd
      console.log('closing out visit');
      var leaveTime = Math.floor(Date.now() / 1000);
      visitLogFunctions.closeOutVisit(visitId, connectedUsers[myUserId].score, leaveTime-startTime, connectedUsers[myUserId].gamesWon, connectedUsers[myUserId].gamesLost);

    } else if (!myUserId) {
      var leaveTime = Math.floor(Date.now() / 1000);
      generalLogFunctions.logMessage('user from ' + clientIp + ' stayed for ' + (leaveTime-startTime) + ' then left without continue');
    }

    connectedUsers[myUserId] = undefined;
  });

});
