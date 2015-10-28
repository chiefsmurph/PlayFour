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
			selectedQueue: [],
			opp: null,
			myId: null,
			score: 0
		};
	},
	componentDidMount: function () {

		var that = this;
		this.socket = io();

		if (docCookies.hasItem('userStatus')) {
			var userStatus = JSON.parse(docCookies.getItem('userStatus'));
			this.props.scoreChange(userStatus.score);

			setTimeout(function() {
				this.props.headerChange('welcome back');
				this.socket.emit('authorizeScore', userStatus);
			}.bind(this), 1200);

		} else {

			setTimeout(function() {
				this.props.headerChange('welcome new user...<br>now registering');
				this.socket.emit('newUser');
			}.bind(this), 1200);

		}

		this.socket.on('welcome', function(data) {
			this.setState({
				userId: data.userId
			});
			this.props.headerChange('now registered...<br>waiting for opponent');
			setTimeout(function() {
				this.socket.emit('checkForWaiting');
			}.bind(this), 700);
		}.bind(this));

		this.socket.on('authorization', function(data) {
			if (data) {
				this.props.headerChange('you have been authorized...<br>waiting for opponent');
				setTimeout(function() {
					this.socket.emit('checkForWaiting');
				}.bind(this), 700);
			} else {
				this.props.headerChange('you are such a hackzor...<br>get outta here');
			}
		}.bind(this));

		this.socket.on('opp', function(data) {

			this.setState({
				opp: data.opp.userId
			}, function() {

					if (data.passback) {
						this.props.headerChange('connecting to opponent: ' + this.state.opp);
						this.socket.emit('opp', {opp: data.opp});
					} else {
						this.props.headerChange('connected to opponent: ' + this.state.opp);
						this.props.inGameChange(true);

						setTimeout(function() {
							this.props.headerChange('opponent starts');
						}.bind(this), 1800);

					}

			});

		}.bind(this));

		this.socket.on('connected', function(data) {
			this.props.headerChange('connected to opponent: ' + data.opp);

			setTimeout(function() {
				this.props.headerChange('you start');

					this.setState({
						myTurn: true
					});
					this.props.inGameChange(true);
					console.log('here');

			}.bind(this), 1800);


		}.bind(this));

		this.socket.on('winner', function(data) {
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

		this.socket.on('loner', function() {
			this.props.headerChange(this.state.opp + ' left.  <br>waiting for new player. ');

			this.socket.emit('loner', {round: this.props.curRound});
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

		this.socket.on('receiveClick', function(data) {

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

		this.socket.on('updateLocal', function(data) {
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
		// this.socket = io();
		// this.socket.on('comments', function (comments) {
		// 	that.setState({ comments: comments });
		// });
		// this.socket.emit('fetchComments');
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

		if (this.isNoneSelected() ) {

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

											this.setState({
												myTurn: false,
												currentPlay: [],
												pastPlay: [],
												selectedQueue: []
											});

											this.socket.emit('fail', {move: this.state.currentPlay, round: this.props.curRound});

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

											this.socket.emit("sendClick", {play: index});

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
		// this.socket = io();
		// this.socket.on('comments', function (comments) {
		// 	that.setState({ comments: comments });
		// });
		// this.socket.emit('fetchComments');

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
			optionalCurrent = (<div>Current Round: <div id='roundScore' className='odometer'>{this.props.curRound}</div></div>)
		}
		return (
			<div className='headerBoard'>
				<div id='infoPanel'>
					<div>Your Score: <div id='score' className='odometer'>{this.props.score}</div></div>
					{optionalCurrent}
				</div>
				<div id='mainText' dangerouslySetInnerHTML={{__html: this.props.headerText}}></div>
			</div>
		);
	}
});
var TapFour = React.createClass({
	getInitialState: function() {
		return {
			headerText: "Welcome to Tap Four",
			score: 0,
			curRound: 0,
			inGame: false,
		};
	},
	componentDidMount: function() {
		// var that = this;
		// this.socket = io();
		// this.socket.on('comments', function (comments) {
		// 	that.setState({ comments: comments });
		// });
		// this.socket.emit('fetchComments');

		if ('ontouchstart' in document) {
		    $('body').removeClass('no-touch');
		}

	},

	headerChange: function(text) {
		console.log(text);
		this.setState({
			headerText: text
		})
	},

	scoreChange: function(score) {
		console.log(score);
		this.setState({
			score: score
		})
	},

	roundChange: function(score) {
		console.log(score);
		this.setState({
			curRound: score
		})
	},

	inGameChange: function(bool) {
		console.log(score);
		this.setState({
			inGame: bool
		})
	},

	render: function() {
		return (
			<div>
				<HeaderBoard score={this.state.score} curRound={this.state.curRound} headerText={this.state.headerText} getInGame={this.state.inGame} />
				<GameArea scoreChange={this.scoreChange} roundChange={this.roundChange} score={this.state.score} curRound={this.state.curRound} headerChange={this.headerChange} inGameChange={this.inGameChange} />
			</div>
		);
	}
});


React.render(
	<TapFour/>,
	document.getElementById('content')
);
