'use strict';

var React = require("react");
var ReactDOM = require("react-dom");
var ReactFitText = require('react-fittext');


require("./index.html");

require('./css/style.css');
require('./css/tooltip.css');
require('./img/tapfour.png');
require('./js/odometer-0.4.6/themes/odometer-theme-minimal.css');

var infoIconPNG = require('./img/info_icon2.png');
var winnersIconPNG = require('./img/winnersicon2.png');

var bob = require('./img/newbob.png');
var docCookies = require('./js/mozilla-cookies.js');
require('./js/odometer-0.4.6/odometer.min.js');

var OdometerComponent = require('./js/react-odometer.js');
var connectedSound = new Audio(require('./audio/connected.mp3'));

var playerTimeout;
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
var startCount = function() {
	clearCount();
	playerTimeout = setTimeout(function() {
		if (this.props.currentlyInGame) {
			console.log('timed out');
			mySocket.emit('fail', {round: this.props.curRound, timedout: true});
			window.location.replace('http://chiefsmurph.com/tapfour10dollars/sleeping');	// wake up
		}
	}.bind(this), 9000);		/// you have 9000 sec to make a move
};
var clearCount = function() {
	clearTimeout(playerTimeout);
	playerTimeout = null;
}
var GameArea = React.createClass({
	getInitialState: function () {
		return {
			userId: null,
			myTurn: false,
			currentPlay: [],
			pastPlay: [],
			myLastPlay: [],
			selected: [null, null, null, null, null],
			justClicked: 0,
			roundInc: 10,
			selectedQueue: [],
			opp: null,
			myId: null,
			score: 0
		};
	},
	componentDidMount: function () {

		mySocket = io.connect('https://chiefsmurph.com', {
			path: '/tapfour10dollars/socket.io',
			secure: true
		});

		mySocket.on('scoreToBeat', function(data) {
			console.log('score to beat ' + JSON.stringify(data));
			this.props.updateScoreToBeat(data.score);
		}.bind(this));

		mySocket.on('welcome', function(data) {
			this.setState({
				userId: data.userId
			});
			this.props.headerChange('now registered as ' + data.userId + '...<br>waiting for opponent');
			setTimeout(function() {
				mySocket.emit('checkForWaiting');
			}.bind(this), 700);
			docCookies.setItem('TAPFOURUSERSTATUS', JSON.stringify({
				userId: data.userId,
				score: 0,
				handshake: ''
			}), 31536e3, "/");
		}.bind(this));

		mySocket.on('authorization', function(data) {
			if (data.response) {
				this.setState({
					userId: data.userId
				})
				if (data.requestContact) {
					this.props.headerChange('authorized as ' + data.userId + '<br>(rank #' + (data.rank || 'n/a') + ')...');
					setTimeout(function() {
						this.props.headerChange('more info needed');
						this.props.showRequestInfo();
					}.bind(this), 500);
				} else {
					this.props.headerChange('authorized as ' + data.userId + '<br>(rank: #' + (data.rank || 'n/a') + ')');

					setTimeout(function() {
						this.props.headerChange('authorized as ' + data.userId + '<br>now waiting for opponent...');
					}.bind(this), 1000);

					setTimeout(function() {
						mySocket.emit('checkForWaiting');
					}.bind(this), 1700);
				}
			} else {
				this.props.headerChange('you are already logged in ya bozo<br>click <a href="/reAuth">here</a> if you continue to have problems');
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
						this.props.headerChange('connected to opponent:<br><span class="small">' + this.state.opp + ' (#' + (data.rank || 'n/a') + ')</span>');
						this.props.inGameChange(true);

						setTimeout(function() {
							this.props.headerChange('opponent starts');
						}.bind(this), 1800);

					}

			});

			connectedSound.play();

		}.bind(this));

		mySocket.on('connected', function(data) {

			connectedSound.play();

			this.setState({
				opp: data.opp.userId
			}, function() {

				this.props.headerChange('connected to opponent:<br><span class="small">' + this.state.opp + ' (#' + (data.rank || 'n/a') + ')</span>');

				setTimeout(function() {

					if (this.state.opp) {

						this.props.headerChange('you start');
						this.setState({
							myTurn: true
						});
						this.props.inGameChange(true);
						startCount.call(this);

					}

				}.bind(this), 1800);

			});

		}.bind(this));

		mySocket.on('winner', function(data) {

			var wrong = data.move[data.move.length-1];
			displayNum.call(this, wrong, 'red');

			if (data.repeat) {
				this.props.headerChange('you win! opp played ' + data.move + ' twice in a row');
			} else if (data.timedout) {
				this.props.headerChange('you win! opp fell asleep on the job');
			} else {
				this.props.headerChange('you win! opp played ' + data.move + ' after ' + this.state.pastPlay);
			}

			var newScore = this.props.score + this.props.curRound;
			this.props.roundChange(0);
			this.props.inGameChange(false);
			this.setState({
				myTurn: false,
				currentPlay: [],
				pastPlay: [],
				myLastPlay: [],
				selected: [null, false, false, false, false],
				selectedQueue: []
			});


			setTimeout(function() {
				if(this.state.opp) {	// of most importance...constantly check for these settimeouts
					this.props.headerChange('your move / winner starts');
					this.props.headerChange('new game...');
					this.props.inGameChange(true);
				}
			}.bind(this), 3700);

			setTimeout(function() {
				if(this.state.opp) {	// of most importance...constantly check for these settimeouts
					this.props.headerChange('your move / winner starts');
				}
			}.bind(this), 4000);

			setTimeout(function() {
				if(this.state.opp) {	// of most importance...constantly check for these settimeouts
					this.setState({
						myTurn: true
					});
					startCount.call(this);
				}
			}.bind(this), 4100);

		}.bind(this));

		mySocket.on('loner', function() {
			clearCount();
			this.props.headerChange(this.state.opp + ' left.  <br>waiting for new player. ');

			mySocket.emit('loner', {round: this.props.curRound});
			var newScore = this.props.score + this.props.curRound;
			this.props.roundChange(0);

			this.setState({
				myTurn: false,
				currentPlay: [],
				pastPlay: [],
				myLastPlay: [],
				selected: [null, false, false, false, false],
				selectedQueue: [],
				opp: null
			});
			this.props.inGameChange(false);
		}.bind(this));

		mySocket.on('roundInc', function(data) {
			console.debug('roundinc ' + data);
			this.setState({
				roundInc: data
			});
			if (data === 20) {
				this.props.headerChange('-- double time mode enabled! -- <br>rounds worth 20!');
			} else {
				this.props.headerChange('-- double time mode ended --');
			}
		}.bind(this));

		mySocket.on('receiveClick', function(data) {

			var num = data.play;

			this.setState({
				currentPlay: this.state.currentPlay.concat(num)
			}, function() {

				if (this.state.currentPlay.length === 4) {

					// end of move its a good one

					setTimeout(function() {

						this.props.headerChange('opponent played valid move');

						this.props.roundChange(this.props.curRound + this.state.roundInc);

						setTimeout(function() {

									//console.log('opp played ' + this.state.currentPlay);
									setTimeout(function() {
										this.setState({
											myTurn: true,
											pastPlay: this.state.currentPlay,
											currentPlay: []
										});
										startCount.call(this);
									}.bind(this), 100);
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
			console.debug(JSON.stringify(data));
			this.props.scoreChange(data.score);
			if (data.userId) {
				docCookies.setItem('TAPFOURUSERSTATUS', JSON.stringify({
					userId: data.userId,
					score: data.score
				}), 31536e3, "/");
				this.setState({
					userId: data.userId
				});
			} else {
				docCookies.setItem('TAPFOURUSERSTATUS', JSON.stringify({
					score: data.score,
					handshake: data.handshake,
					userId: this.state.userId
				}), 31536e3, "/");
			}

		}.bind(this));

		//	//	//
			//	//	//
				//	//	//

		if (docCookies.hasItem('TAPFOURUSERSTATUS')) {
			var TAPFOURUSERSTATUS = JSON.parse(docCookies.getItem('TAPFOURUSERSTATUS'));
			this.props.scoreChange(TAPFOURUSERSTATUS.score);

			setTimeout(function() {
				this.props.headerChange('welcome back<br>authorizing now');
				mySocket.emit('authorizeScore', TAPFOURUSERSTATUS);
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

	repeatedMove: function() {
		return (this.state.currentPlay.length === 4 && JSON.stringify(this.state.currentPlay) === JSON.stringify(this.state.myLastPlay) );
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
								if (this.state.pastPlay.length !== 0 && (this.getNumOff() > 1 || (this.getNumOff() !== 1 && this.state.currentPlay.length === 4) || (this.repeatedMove()) ) ) {

											clearCount();
											// in case of wrong click
											displayNum.call(this, index, 'red', 1000);

											console.log('num off ' + this.getNumOff());
											console.log('pastplay ' + this.state.pastPlay);

											if (!this.repeatedMove()) {
												this.props.headerChange('YOU LOSE :( you played ' + this.state.currentPlay + ' after ' + this.state.pastPlay);
												mySocket.emit('fail', {move: this.state.currentPlay, round: this.props.curRound});
											} else {
												this.props.headerChange('YOU LOSE :( cant repeat moves (you played ' + this.state.currentPlay  + ' twice)');
												mySocket.emit('fail', {move: this.state.currentPlay, round: this.props.curRound, repeat: true});
											}


											this.props.inGameChange(false);
											this.props.roundChange(0);

											this.setState({
												myTurn: false,
												currentPlay: [],
												pastPlay: [],
												myLastPlay: [],
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

											// in case of good click :-)

											console.log('sending');

											mySocket.emit("sendClick", {play: index});



											if (this.state.currentPlay.length === 4) {

												clearCount();
													// click number 4! woo hoo
													// switch turns
												setTimeout(function() {
													if (this.props.currentlyInGame) {
														this.props.headerChange('great move!');
													}
												}.bind(this), 100);

												displayNum.call(this, index, 'green');


												this.setState({
													currentPlay: [],
													pastPlay: this.state.currentPlay,
													myLastPlay: this.state.currentPlay,
													myTurn: false
												});

												this.props.roundChange(this.props.curRound + this.state.roundInc);

												setTimeout(function() {
													if (this.props.currentlyInGame) {
														this.props.headerChange('now opponents turn');
													}
												}.bind(this), 1000);

											} else {		// click 1,2,3

												setTimeout(function() {
													if (this.props.currentlyInGame) {
														this.props.headerChange('valid click');
													}
												}.bind(this), 100+Math.random()*300);

												displayNum.call(this, index, 'blue');
												startCount.call(this);

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
	getInitialState: function() {
		return {
			mouthPos: 'norm'
		}
	},
	componentDidMount: function() {
	},
	swapMouth: function() {
		console.log('swap');
		if (this.state.mouthPos === 'norm') {
			this.setState({ mouthPos: 'open'});
		} else if (this.state.mouthPos === 'open') {
			this.setState({ mouthPos: 'norm'})
		}
	},

	toggleWinners: function() {
		//this.changeWinners();
		this.props.toggleWinners();
	},
	render: function() {
		var optionalCurrent;
		optionalCurrent = (<div className={(this.props.getInGame) ? '' : 'hidden'}>Current Round: <OdometerComponent id='roundScore' className='odometer' value={this.props.curRound}></OdometerComponent></div>);

		var optionalScoreToBeat;
		optionalScoreToBeat = (<div className={(this.props.scoreToBeat !== null) ? '' : 'hidden'}>Score To Beat: <OdometerComponent id='scoretobeat' className='odometer' value={this.props.scoreToBeat}></OdometerComponent></div>);

		return (
			<div className='headerBoard'>
				<div id='infoPanel'>
					<div>Your Score: <OdometerComponent id='score' className='odometer' value={this.props.score}></OdometerComponent></div>
					{optionalCurrent}
					{optionalScoreToBeat}
				</div>

				<span id="infoIcon" className="icon tooltip-bottom icon" data-tooltip="Info">
					<img src={infoIconPNG} onClick={this.props.toggleInfo} className={(this.props.displayingInfo) ? 'faded' : ''} />
				</span>

				<span id="winnersIcon" className="icon tooltip-bottom" data-tooltip="Winner">
					<img src={winnersIconPNG} className={(this.props.displayingWinners) ? 'faded' : ''} onClick={this.toggleWinners} />
				</span>

				<div id='mainText' dangerouslySetInnerHTML={{__html: this.props.headerText}}></div>
			</div>
		);
	}
});
var ContactRequest = React.createClass({
	getInitialState: function() {
		return {
			currentChoice: null,
			showCash: false,
			showPaypal: false,
			errMessage: ''
		}
	},
	showCash: function() {
		this.setState({
			currentChoice: 'cash',
			showCash: true,
			showPaypal: false
		});
	},
	showPaypal: function() {
		this.setState({
			currentChoice: 'paypal',
			showCash: false,
			showPaypal: true
		});
	},
	hideAll: function() {
		this.setState({
			currentChoice: 'asklater',
			showCash: false,
			showPaypal: false
		});
	},
	submitForm: function() {
		if (this.state.currentChoice === 'asklater') {
			this.props.hideMe();
			this.props.headerChange('well alright then...<br>now waiting for opponent');
			console.log('asklater');
		} else {
			mySocket.emit('sendPreferences', {
				contactEmail: (this.refs.contactEmail) ? this.refs.contactEmail.getDOMNode().value : '',
				paypalEmail: (this.refs.paypalEmail) ? this.refs.paypalEmail.getDOMNode().value : '',
				address: (this.refs.address) ? this.refs.address.getDOMNode().value : ''
			});
			this.props.hideMe();

			this.props.headerChange('thank you for that info...<br>now waiting for opponent');
		}

		setTimeout(function() {
			mySocket.emit('checkForWaiting');
		}.bind(this), 700);

	},
	render: function() {

		var optionalCash;
		if (this.state.showCash) {
			optionalCash = (
				<div>
					Contact Email:<br/><input type='text' ref='contactEmail'/><br/>
					Address:<br/><input type='text' ref='address'/>
				</div>
			);
		};

		var optionalPaypal;
		if (this.state.showPaypal) {
			optionalPaypal = (
				<div>
					Contact Email:<br/><input type='text' ref='contactEmail' /><br/>
					Paypal Email:<br/><input type='text' ref='paypalEmail' />
				</div>
			);
		}


		return (
			<div className='panel' id='requestPanel'>
				<div>
					<h3>we see you are doing pretty well...</h3>
					<h2>If you end up winning, how would you like your $10?</h2>
					<table>
						<tbody>
							<tr>
								<td>
									<input type='radio' name='payMethod' id='cash' onChange={this.showCash} /><label htmlFor='cash'>Cash</label><br/>
									<input type='radio' name='payMethod' id='paypal' onChange={this.showPaypal} /><label htmlFor='paypal'>Paypal</label><br/>
									<input type='radio' name='payMethod' id='asklater' onChange={this.hideAll} /><label htmlFor='asklater'>Ask me later</label><br/>
								</td>
								<td>
									{optionalCash}
									{optionalPaypal}
								</td>
							</tr>
							<tr>
								<td colSpan='2'>
									<button onClick={this.submitForm}>SUBMIT</button>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
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
		if (docCookies.hasItem('TAPFOURUSERSTATUS')) {
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
			<div className='panel' id='welcomeMessage'>
				<div>
					<p>Hi there!  We see this is{this.state.isnt} your first visit to Tap Four (The Win-Big $10 Giveaway) and even though it is a very simple game, we just wanted to give you a quick rundown on the specifics.</p>
					<div id='examplePullout'>
						<h2>Example matches</h2>
						<div>
							<p>
								Player #1: 3-4-2-2<span className='good'>Good move!</span><br/>
								Player #2: 3-4-1-2<span className='good'>Good move!</span><br/>
								Player #1: 3-2-1-2<span className='good'>Good move!</span><br/>
								Player #2: 3-1-3 !<span className='bad'>Bad move!</span>
							</p>
							<p>
								Player #1: 1-4-1-3<span className='good'>Good move!</span><br/>
								Player #2: 1-1-1-3<span className='good'>Good move!</span><br/>
								Player #1: 1-1-1-3 !<span className='bad'>Bad move!</span>
							</p>
							<p>
								Player #1: 3-2-1-4<span className='good'>Good move!</span><br/>
								Player #2: 2-2-1-4<span className='good'>Good move!</span><br/>
								Player #1: 1-2-1-3 !<span className='bad'>Bad move!</span>
							</p>
						</div>
					</div>
					<p>How to play: Players alternate turns.  Each turn consists of four clicks.  The player that starts has complete freedom for all four clicks.  Subsequent turns must be the exact same sequence as the opponent's last turn but must have one click changed.  You also are not allowed to repeat the same move twice in a row.  Click must take no more than 8 seconds to complete.</p>
					<p>Whoever possesses the highest score at the time of the next Win-Big $10 Giveaway will receive $10 in cash or paypal.  Rules and everything are subject to change.</p>
					<div id='countDown'>
						Time of next $10 Giveaway:
						<b className='inlineblock'>11:59pm July 4, 2020 PST</b><br/>
						<i>Note: new $10 Giveaway begins rigsht after.  Winner can't win more than once</i>
					</div>
					<button onClick={this.continueClick}>click here to continue</button>
				</div>
			</div>
		);
	}
});
var WinnersBoard = React.createClass({
	render: function() {
		return (
			<div className={(!this.props.showing) ? "hidden panel" : "panel"} id='winnersBoard' >
				<div>
					<span id='x' onClick={this.props.toggleWinners}>[x]</span>
					<h2>Congratulations to our first winner</h2>
					<h1>Bob</h1>
					<img src={bob} className='winpic'/><br/>
					<section>
						<code>from Michigan (USA)</code><br/>
						<code>Date won... November 9, 2015</code>
					</section>
				</div>
			</div>
		);
	}
});
var TapFour = React.createClass({
	getInitialState: function() {
		return {
			headerText: "Welcome to Tap Four<br><i>next $10 giveaway: 11:59pm 11/30</i>",
			score: 0,
			curRound: 0,
			inGame: false,
			displayWelcome: false,
			displayRequest: false,
			displayingWinners: false,
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

		if (docCookies.hasItem('TAPFOURUSERSTATUS')) {
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
		if (this.state.displayingWinners && !this.state.displayWelcome) {
			this.setState({
				displayingWinners: false
			});
		}
		this.setState({
			displayWelcome: !this.state.displayWelcome
		});
	},

	toggleWinners: function() {
		if (this.state.displayWelcome && !this.state.displayingWinners) {
			this.setState({
				displayWelcome: false
			});
		}
		this.setState({
			displayingWinners: !this.state.displayingWinners
		});

		return false;
	},

	updateScoreToBeat: function(s) {
		console.log('score updaet ' + s);
		this.setState({
			scoreToBeat: s
		});
	},

	showRequestInfo: function() {
		console.log('show requestpanel');
		this.setState({
			displayRequest: true,
			displayWelcome: false
		});
	},
	closeRequestPanel: function() {
		this.setState({
			displayRequest: false,
			displayWelcome: false
		});
	},

	render: function() {

		var optionalWelcome;
		if (this.state.displayWelcome) {
			optionalWelcome = (<WelcomeMessage continueOnNewUser={this.continueOnNewUser} />);
		}
		var optionalRequest;
		if (this.state.displayRequest) {
			optionalRequest = (<ContactRequest hideMe={this.closeRequestPanel} headerChange={this.headerChange} />);
		}
		var optionalWinners;
		optionalWinners = (<WinnersBoard toggleWinners={this.toggleWinners} showing={this.state.displayingWinners} />)

		return (
			<div id='container'>
				<table>
					<tr><td><HeaderBoard toggleInfo={this.toggleInfo} toggleWinners={this.toggleWinners} score={this.state.score} curRound={this.state.curRound} scoreToBeat={this.state.scoreToBeat} headerText={this.state.headerText} getInGame={this.state.inGame} displayingInfo={this.state.displayWelcome} displayingWinners={this.state.displayingWinners} /></td></tr>
					<tr><td><GameArea toggleInfo={this.toggleInfo} scoreChange={this.scoreChange} roundChange={this.roundChange} updateScoreToBeat={this.updateScoreToBeat} score={this.state.score} curRound={this.state.curRound} headerChange={this.headerChange} currentlyInGame={this.state.inGame} inGameChange={this.inGameChange} showRequestInfo={this.showRequestInfo} /></td></tr>
				</table>
				{optionalWelcome}
				{optionalRequest}
				{optionalWinners}
			</div>
		);
	}
});


ReactDOM.render(
	<TapFour/>,
	document.getElementById('content')
);
