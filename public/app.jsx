var mySocket;

var displayNum = function(num) {

	var resetselected = [null, false, false, false, false];
	var newselected = resetselected.slice();
	newselected[num] = true;
	this.setState({
		selected: newselected
	});

	setTimeout(function() {
		var resetselected = this.state.selected;
		resetselected[num] = false;
		this.setState({
			selected: resetselected
		});
	}.bind(this), 300);
	console.log('displaying ' + num);
}
var GameArea = React.createClass({
	getInitialState: function () {
		return {
			userId: null,
			myTurn: false,
			currentPlay: [],
			pastPlay: [],
			selected: [null, false, false, false, false],
			justClicked: 0,
			selectedQueue: [],
			opp: null,
			myId: null,
			score: 0
		};
	},
	componentDidMount: function () {

		mySocket = io();

		if (docCookies.hasItem('userStatus')) {
			var userStatus = JSON.parse(docCookies.getItem('userStatus'));
			this.props.scoreChange(userStatus.score);

			setTimeout(function() {
				this.props.headerChange('welcome back<br>authorizing now');
				mySocket.emit('authorizeScore', userStatus);
			}.bind(this), 1200);

		} else {

			setTimeout(function() {
				this.props.displayWelcomeChange(true);
			}.bind(this), 200);

			// setTimeout(function() {
			// 	this.props.headerChange('welcome new user...<br>now registering');
			// 	mySocket.emit('newUser');
			// }.bind(this), 1200);

		}

		mySocket.on('scoreToBeat', function(data) {
			this.props.updateScoreToBeat(data.score);
		}.bind(this));

		mySocket.on('welcome', function(data) {
			this.setState({
				userId: data.userId
			});
			this.props.headerChange('now registered...<br>waiting for opponent');
			setTimeout(function() {
				mySocket.emit('checkForWaiting');
			}.bind(this), 700);
		}.bind(this));

		mySocket.on('authorization', function(data) {
			if (data) {
				this.props.headerChange('you have been authorized...<br>waiting for opponent');
				setTimeout(function() {
					mySocket.emit('checkForWaiting');
				}.bind(this), 700);
			} else {
				this.props.headerChange('you are such a hackzor...<br>get outta here');
			}
		}.bind(this));

		mySocket.on('opp', function(data) {

			this.setState({
				opp: data.opp.userId
			}, function() {

					if (data.passback) {
						this.props.headerChange('connecting to opponent: ' + this.state.opp);
						mySocket.emit('opp', {opp: data.opp});
					} else {
						this.props.headerChange('connected to opponent: ' + this.state.opp);
						this.props.inGameChange(true);

						setTimeout(function() {
							this.props.headerChange('opponent starts');
						}.bind(this), 1800);

					}

			});

		}.bind(this));

		mySocket.on('connected', function(data) {

			this.setState({
				opp: data.opp.userId
			}, function() {

				this.props.headerChange('connected to opponent: ' + this.state.opp);

				setTimeout(function() {
					this.props.headerChange('you start');

						this.setState({
							myTurn: true
						});
						this.props.inGameChange(true);
						console.log('here');

				}.bind(this), 1800);

			});

		}.bind(this));

		mySocket.on('winner', function(data) {
			this.props.headerChange('you win! opp played ' + data.move + ' after ' + this.state.pastPlay);
			var newScore = this.props.score + this.props.curRound;
			this.props.scoreChange(newScore);
			this.props.roundChange(0);
			this.props.inGameChange(false);
			this.setState({
				myTurn: false,
				currentPlay: [],
				pastPlay: [],
				selected: [null, false, false, false, false],
				selectedQueue: []
			});


			setTimeout(function() {
				this.setState({
					myTurn: true
				});
				this.props.headerChange('new game...<br>your move / winner starts');
				this.props.inGameChange(true);
			}.bind(this), 4000);

		}.bind(this));

		mySocket.on('loner', function() {
			this.props.headerChange(this.state.opp + ' left.  <br>waiting for new player. ');

			mySocket.emit('loner', {round: this.props.curRound});
			var newScore = this.props.score + this.props.curRound;
			this.props.scoreChange(newScore);
			this.props.roundChange(0);

			this.setState({
				myTurn: false,
				currentPlay: [],
				pastPlay: [],
				selected: [null, false, false, false, false],
				selectedQueue: [],
				opp: null
			});
			this.props.inGameChange(false);
		}.bind(this));

		mySocket.on('receiveClick', function(data) {

			var num = data.play;

			displayNum.call(this, num);

			this.setState({
				currentPlay: this.state.currentPlay.concat(num)
			}, function() {

				if (this.state.currentPlay.length === 4) {

					setTimeout(function() {

						this.props.headerChange('opponent played valid move');

						setTimeout(function() {

									this.props.roundChange(this.props.curRound + 10);
									//console.log('opp played ' + this.state.currentPlay);
									this.setState({
										myTurn: true,
										pastPlay: this.state.currentPlay,
										currentPlay: []
									});
									this.props.headerChange('now your turn');

						}.bind(this), 1500);

					}.bind(this), 500);

				}
			});

		}.bind(this));

		mySocket.on('updateLocal', function(data) {
			docCookies.setItem('userStatus', JSON.stringify({
				userId: this.state.userId,
				score: data.score,
				handshake: data.handshake
			}));
		}.bind(this));


		// setTimeout(function() {
		// 	this.props.headerChange('Alright everybody...here we go!');
		// 	setTimeout(function() {
		// 		this.setState({
		// 			inGame: true,
		// 			myTurn: true
		// 		});
		//
		// 	}.bind(this), 1000);
		//
		// }.bind(this), 2000);

		// var that = this;
		// mySocket = io();
		// mySocket.on('comments', function (comments) {
		// 	that.setState({ comments: comments });
		// });
		// mySocket.emit('fetchComments');
	},

	isNoneSelected: function() {
		return JSON.stringify(this.state.selected) === "[null,false,false,false,false]";
	},

	getNumOff: function() {


		if (this.state.pastPlay.length === 0) {
			return 0;
		}
		var numOff = 0;
		for (var i = 0; i < this.state.currentPlay.length; i++) {
			if (this.state.pastPlay[i] !== this.state.currentPlay[i]) {
				numOff++;
			}
		}
		console.log('currentplay ' + this.state.currentPlay);
		console.log('pastplay ' + this.state.pastPlay);
		console.log('numoff ' + numOff);

		return numOff;
	},


	handleClick: function(index) {

		console.log('myturn ' + this.state.myTurn);
		console.log('isNoneSelected ' + this.isNoneSelected());

		if (this.isNoneSelected() && this.state.justClicked !== index) {

			this.setState({
				justClicked: index
			});

			setTimeout(function() {
				this.setState({
					justClicked: 0
				});
			}.bind(this), 500);

			console.log('here')

				if (this.state.myTurn) {

							this.setState({
								currentPlay: this.state.currentPlay.concat(index)
							}, function() {

								displayNum.call(this,index);

								console.log(this.state.currentPlay);

								if (this.state.pastPlay.length !== 0 && (this.getNumOff() > 1 || (this.getNumOff() !== 1 && this.state.currentPlay.length === 4))) {
											console.log('num off ' + this.getNumOff());
											console.log('pastplay ' + this.state.pastPlay);
											this.props.headerChange('YOU LOSE :( you played ' + this.state.currentPlay + ' after ' + this.state.pastPlay);

											mySocket.emit('fail', {move: this.state.currentPlay, round: this.props.curRound});

											this.props.inGameChange(false);
											this.props.scoreChange(this.props.score - (this.props.curRound / 2) );
											this.props.roundChange(0);

											this.setState({
												myTurn: false,
												currentPlay: [],
												pastPlay: [],
												selected: [null, false, false, false, false],
												selectedQueue: []
											});

											setTimeout(function() {
												this.setState({
													myTurn: false
												});
												this.props.headerChange('new game...<br>opponent starts');
												this.props.inGameChange(true);
											}.bind(this), 4000);

											// setTimeout(function() {
											// 	this.props.headerChange('new game...your turn');
											// 	this.setState({
											// 		myTurn: true,
											// 		inGame: true
											// 	});
											// }.bind(this), 700);


								} else {

											console.log('sending');

											mySocket.emit("sendClick", {play: index});

											setTimeout(function() {
												this.props.headerChange('valid move');
											}.bind(this), 500);

											if (this.state.currentPlay.length === 4) {

												this.setState({
													currentPlay: [],
													pastPlay: this.state.currentPlay,
													myTurn: false
												});

												setTimeout(function() {

														this.props.headerChange('now opponents turn');

														this.props.roundChange(this.props.curRound + 10);

												}.bind(this), 1000);

											}

								}


							});
				}

		}
	},
	render: function() {
		return (
			<table id='gameArea' className={(this.state.myTurn) ? 'myTurn' : ''}>
				<tr>
					<MyButton id='1' handleClick={this.handleClick} selected={this.state.selected[1]} />
					<MyButton id='2' handleClick={this.handleClick} selected={this.state.selected[2]} />
				</tr>
				<tr>
					<MyButton id='3' handleClick={this.handleClick} selected={this.state.selected[3]} />
					<MyButton id='4' handleClick={this.handleClick} selected={this.state.selected[4]} />
				</tr>
			</table>
		);
	}
});
var MyButton = React.createClass({
	componentDidMount: function () {
		// var that = this;
		// mySocket = io();
		// mySocket.on('comments', function (comments) {
		// 	that.setState({ comments: comments });
		// });
		// mySocket.emit('fetchComments');

	},
	handleClick: function(i) {
		this.props.handleClick(i);
	},

	render: function() {
		return (
			<td onClick={this.handleClick.bind(this, this.props.id)} onTouchStart={this.handleClick.bind(this, this.props.id)} className={(this.props.selected) ? 'selected' : ''}>
				<h1>{this.props.id}</h1>
			</td>
		);
	}
});
var HeaderBoard = React.createClass({
	componentDidMount: function() {

	},
	render: function() {
		var optionalCurrent;
		if (this.props.getInGame) {
			optionalCurrent = (<div>Current Round: <div id='roundScore' className='odometer'>{this.props.curRound}</div></div>);
		}
		var optionalScoreToBeat;
		if (this.props.scoreToBeat) {
			optionalScoreToBeat = (<div>Score To Beat: <div id='scoretobeat' className='odometer'>{this.props.scoreToBeat}</div></div>);
		}
		return (
			<div className='headerBoard'>
				<div id='infoPanel'>
					<div>Your Score: <div id='score' className='odometer'>{this.props.score}</div></div>
					{optionalCurrent}
					{optionalScoreToBeat}
				</div>
				<div id='mainText' dangerouslySetInnerHTML={{__html: this.props.headerText}}></div>
			</div>
		);
	}
});
var WelcomeMessage = React.createClass({
	continueClick: function() {
		this.props.displayWelcomeChange(false);
	},
	render: function() {
		return (
			<div id='welcomeMessage'>
				<div>
					<p>Hi there!  We see this is your first visit to Tap Four (The Monthly $10 Giveaway) and even though it is a very simple game, we just wanted to give you a quick rundown on the specifics.</p>
					<p>How to play: Each turn consists of four clicks.  The player that starts has complete freedom.  All subsequent plays must be the same as the previous play except one of the moves must be different.</p>
					<p>At the end of the month, whoever is at the top of the leaderboard will receive $10 in cash or paypal.</p>
					<button onClick={this.continueClick}>click here to continue</button>
				</div>
			</div>
		);
	}
});
var TapFour = React.createClass({
	getInitialState: function() {
		return {
			headerText: "Welcome to Tap Four<br><i>the monthly $10 giveaway</i>",
			score: 0,
			curRound: 0,
			inGame: false,
			displayWelcome: false,
			scoreToBeat: null
		};
	},
	componentDidMount: function() {
		// var that = this;
		// mySocket = io();
		// mySocket.on('comments', function (comments) {
		// 	that.setState({ comments: comments });
		// });
		// mySocket.emit('fetchComments');

		if ('ontouchstart' in document) {
		    $('body').removeClass('no-touch');
		}

	},

	headerChange: function(text) {
		this.setState({
			headerText: text
		});
	},

	scoreChange: function(score) {
		this.setState({
			score: score
		});
	},

	roundChange: function(score) {
		this.setState({
			curRound: score
		});
	},

	inGameChange: function(bool) {
		this.setState({
			inGame: bool
		});
	},

	displayWelcomeChange: function(bool, cb) {
		if (!bool) {
			this.headerChange('welcome new user...<br>now registering');
			mySocket.emit('newUser');
		}
		this.setState({
			displayWelcome: bool
		});
	},

	updateScoreToBeat: function(s) {
		console.log('score updaet ' + s);
		this.setState({
			scoreToBeat: s
		});
	},

	render: function() {

		var optionalEl;
		if (this.state.displayWelcome) {
			optionalEl = (<WelcomeMessage displayWelcomeChange={this.displayWelcomeChange} />);
		}

		return (
			<div>
				<HeaderBoard score={this.state.score} curRound={this.state.curRound} scoreToBeat={this.state.scoreToBeat} headerText={this.state.headerText} getInGame={this.state.inGame} />
				<GameArea displayWelcomeChange={this.displayWelcomeChange} scoreChange={this.scoreChange} roundChange={this.roundChange} updateScoreToBeat={this.updateScoreToBeat} score={this.state.score} curRound={this.state.curRound} headerChange={this.headerChange} inGameChange={this.inGameChange} />
				{optionalEl}
			</div>
		);
	}
});


React.render(
	<TapFour/>,
	document.getElementById('content')
);
