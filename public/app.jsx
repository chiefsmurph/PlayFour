'use strict';

var React = require('react');

require("./index.html");
require('./css/style.css');
require('./css/tooltip.css');
var infoIconPNG = require('./img/info_icon2.png');
var docCookies = require('./js/mozilla-cookies.js');
var OdometerComponent = require('../node_modules/react-odometer/react-odometer.js');

var mySocket;

var displayNum = function(num, color, time) {

	time = (typeof time !== 'undefined') ? time : 300;
	var resetselected = [null, null, null, null, null];
	var newselected = resetselected.slice();
	newselected[num] = color;
	this.setState({
		selected: newselected
	});

	setTimeout(function() {
		var resetselected = this.state.selected;
		resetselected[num] = false;
		this.setState({
			selected: resetselected
		});
	}.bind(this), time);
	console.log('displaying ' + num);
}
var GameArea = React.createClass({
	getInitialState: function () {
		return {
			userId: null,
			myTurn: false,
			currentPlay: [],
			pastPlay: [],
			selected: [null, null, null, null, null],
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
				this.props.toggleInfo();
			}.bind(this), 200);

			// setTimeout(function() {
			// 	this.props.headerChange('welcome new user...<br>now registering');
			// 	mySocket.emit('newUser');
			// }.bind(this), 1200);

		}

		mySocket.on('scoreToBeat', function(data) {
			console.log('score to beat ' + JSON.stringify(data));
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
			if (data.response) {
				this.setState({
					userId: data.userId
				})
				this.props.headerChange('you have been authorized...<br>waiting for opponent');
				setTimeout(function() {
					mySocket.emit('checkForWaiting');
				}.bind(this), 700);
			} else {
				this.props.headerChange('AUTHENTICATION ERROR...<br>chiefsmurph@gmail.com to reclaim lost scores or click <a href="/reAuth">here</a> to start over.');
			}
		}.bind(this));

		mySocket.on('opp', function(data) {

			this.setState({
				opp: data.opp.userId
			}, function() {

					if (data.passback) {
						this.props.headerChange('connecting to opponent:<br><span class="small">' + this.state.opp + '</span>');
						mySocket.emit('opp', {opp: data.opp});
					} else {
						this.props.headerChange('connected to opponent:<br><span class="small">' + this.state.opp + '</span>');
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

				this.props.headerChange('connected to opponent:<br><span class="small">' + this.state.opp + '</span>');

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
				this.props.headerChange('new game...');
				this.props.inGameChange(true);
			}.bind(this), 5000);

			setTimeout(function() {
				this.props.headerChange('your move / winner starts');
			}.bind(this), 5500);

			setTimeout(function() {
				this.setState({
					myTurn: true
				});
			}.bind(this), 5700);

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


					displayNum.call(this, num, 'green');

				} else {
					displayNum.call(this, num, 'blue');
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
		return this.state.selected.every(function(selection) {
			return (!selection);
		});
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
		console.log('selected ' + this.state.selected);

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

								console.log(this.state.currentPlay);

								// first off...is it a bad move?
								if (this.state.pastPlay.length !== 0 && (this.getNumOff() > 1 || (this.getNumOff() !== 1 && this.state.currentPlay.length === 4))) {

											// in case of wrong click
											displayNum.call(this, index, 'red', 1000);

											console.log('num off ' + this.getNumOff());
											console.log('pastplay ' + this.state.pastPlay);
											this.props.headerChange('YOU LOSE :( you played ' + this.state.currentPlay + ' after ' + this.state.pastPlay);

											mySocket.emit('fail', {move: this.state.currentPlay, round: this.props.curRound});

											setTimeout(function() {
												this.props.inGameChange(false);
											}.bind(this), 1000);

											this.props.scoreChange(this.props.score - (this.props.curRound / 2) );
											this.props.roundChange(0);

											this.setState({
												myTurn: false,
												currentPlay: [],
												pastPlay: [],
												selectedQueue: []
											});

											setTimeout(function() {
												this.setState({
													myTurn: false
												});
												this.props.headerChange('new game...<br>opponent starts');
												this.props.inGameChange(true);
											}.bind(this), 5500);

											// setTimeout(function() {
											// 	this.props.headerChange('new game...your turn');
											// 	this.setState({
											// 		myTurn: true,
											// 		inGame: true
											// 	});
											// }.bind(this), 700);


								} else {

											// in case of good click :-)

											console.log('sending');

											mySocket.emit("sendClick", {play: index});



											if (this.state.currentPlay.length === 4) {
													// click number 4! woo hoo
													// switch turns
												setTimeout(function() {
													this.props.headerChange('great move!');
												}.bind(this), 100);

												displayNum.call(this, index, 'green');


												this.setState({
													currentPlay: [],
													pastPlay: this.state.currentPlay,
													myTurn: false
												});

												setTimeout(function() {

														this.props.headerChange('now opponents turn');

														this.props.roundChange(this.props.curRound + 10);

												}.bind(this), 1000);

											} else {		// click 1,2,3

												setTimeout(function() {
													this.props.headerChange('valid click');
												}.bind(this), 100+Math.random()*300);

												displayNum.call(this, index, 'blue');

											}

								}


							});
				}

		}
	},
	render: function() {
		var classString = '';
		if (this.state.myTurn) classString += 'myTurn ';
		if (!this.props.currentlyInGame) classString += 'faded ';
		classString = classString.trim();
		return (
			<table id='gameArea' className={classString}>
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
			<td onClick={this.handleClick.bind(this, this.props.id)} onTouchStart={this.handleClick.bind(this, this.props.id)} className={(this.props.selected) ? this.props.selected : ''}>
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
			optionalCurrent = (<div>Current Round: <OdometerComponent id='roundScore' className='odometer' value={this.props.curRound}></OdometerComponent></div>);
		}
		var optionalScoreToBeat;
		if (this.props.scoreToBeat) {
			optionalScoreToBeat = (<div>Score To Beat: <OdometerComponent id='scoretobeat' className='odometer' value={this.props.scoreToBeat}></OdometerComponent></div>);
		}
		return (
			<div className='headerBoard'>
				<div id='infoPanel'>
					<div>Your Score: <OdometerComponent id='score' className='odometer' value={this.props.score}></OdometerComponent></div>
					{optionalCurrent}
					{optionalScoreToBeat}
				</div>

				<img id='infoIcon' src={infoIconPNG} onClick={this.props.toggleInfo} className={(this.props.displayingInfo) ? 'tooltip-bottom faded' : 'tooltip-bottom'} data-tooltip="Info"/>
				<div id='mainText' dangerouslySetInnerHTML={{__html: this.props.headerText}}></div>
			</div>
		);
	}
});
var WelcomeMessage = React.createClass({
	getInitialState: function() {
		return {
			isnt: ''
		};
	},
	componentDidMount: function() {
		if (docCookies.hasItem('userStatus')) {
			this.setState({
				isnt: 'n\'t'
			});
		}

	},
	continueClick: function() {
		this.props.continueOnNewUser();
	},
	render: function() {
		return (
			<div id='welcomeMessage'>
				<div>
					<p>Hi there!  We see this is{this.state.isnt} your first visit to Tap Four (The Monthly $10 Giveaway) and even though it is a very simple game, we just wanted to give you a quick rundown on the specifics.</p>
					<p>How to play: Players alternate turns.  Each turn consists of four clicks.  The player that starts has complete freedom for all four clicks.  Subsequent turns must be the exact same sequence as the opponent's last turn but must have one click changed.</p>
					<p>At the end of the month, whoever is at the top of the leaderboard will receive $10 in cash or paypal.</p>
					<div id='countDown'>
						Next $10 Giveaway:
						<span className='inlineblock'> 11:59pm November 30, 2015</span>
					</div>
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
			scoreToBeat: null,
			emitOnContinue: true
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

		if (docCookies.hasItem('userStatus')) {
			console.log('woops');
			this.blockEmitOnContinue();
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

	continueOnNewUser: function() {
		if (this.state.emitOnContinue) {
			this.headerChange('welcome new user...<br>now registering');
			mySocket.emit('newUser');

			// its a one time thing alright
			this.blockEmitOnContinue();
		}
		this.toggleInfo();
	},

	blockEmitOnContinue: function() {
		this.setState({
			emitOnContinue: false
		});
	},

	toggleInfo: function() {
		this.setState({
			displayWelcome: !this.state.displayWelcome
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
			optionalEl = (<WelcomeMessage continueOnNewUser={this.continueOnNewUser} />);
		}

		return (
			<div id='container'>
				<table>
					<tr><td><HeaderBoard toggleInfo={this.toggleInfo} score={this.state.score} curRound={this.state.curRound} scoreToBeat={this.state.scoreToBeat} headerText={this.state.headerText} getInGame={this.state.inGame} displayingInfo={this.state.displayWelcome} /></td></tr>
					<tr><td><GameArea toggleInfo={this.toggleInfo} scoreChange={this.scoreChange} roundChange={this.roundChange} updateScoreToBeat={this.updateScoreToBeat} score={this.state.score} curRound={this.state.curRound} headerChange={this.headerChange} currentlyInGame={this.state.inGame} inGameChange={this.inGameChange} /></td></tr>
				</table>
				{optionalEl}
			</div>
		);
	}
});


React.render(
	<TapFour/>,
	document.getElementById('content')
);
