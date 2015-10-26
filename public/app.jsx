var GameArea = React.createClass({
	getInitialState: function () {
		return {
			inGame: false,
			myTurn: false,
			currentPlay: [],
			pastPlay: [],
			selected: [null, false, false, false, false],
			selectedQueue: [],
			opp: null
		};
	},
	componentDidMount: function () {

		var that = this;
		this.socket = io();

		this.socket.on('opp', function(data) {
			this.setState({
				opp: data.opp
			});
			if (data.passback) {
				this.props.headerChange('connecting to opponent: ' + data.opp);
				this.socket.emit('opp', {opp: data.opp});
			} else {
				this.props.headerChange('connected to opponent: ' + data.opp);
				this.setState({
					inGame: true
				});
			}
		}.bind(this));

		this.socket.on('connected', function(data) {
			this.props.headerChange('connected to opponent: ' + data.opp);

			this.setState({
				myTurn: true,
				inGame: true
			});

		}.bind(this));

		this.socket.on('winner', function(data) {
			this.props.headerChange('you win! opp played ' + data.move + ' after ' + this.state.pastPlay);
		}.bind(this));

		this.socket.on('loner', function() {
			this.props.headerChange(this.state.opp + ' left.  waiting for new player. ');
			this.setState({
				inGame: false,
				myTurn: false,
				currentPlay: [],
				pastPlay: [],
				selected: [null, false, false, false, false],
				selectedQueue: [],
				opp: null
			})
			this.socket.emite('loner');
		}.bind(this));

		this.socket.on('receiveClick', function(data) {

			var num = data.play;

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
			}.bind(this), 500);

			this.setState({
				currentPlay: this.state.currentPlay.concat(num)
			}, function() {
				if (this.state.currentPlay.length === 4) {
					console.log('opp played ' + this.state.currentPlay);
					this.setState({
						myTurn: true,
						pastPlay: this.state.currentPlay,
						currentPlay: []
					});
					this.props.headerChange('your turn');
				}
			});

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
		return JSON.stringify(this.state.selected) === "[null, false, false, false, false]";
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

		if (this.state.inGame && this.state.myTurn) {

					this.setState({
						currentPlay: this.state.currentPlay.concat(index)
					}, function() {

						console.log(this.state.currentPlay);

						if (this.state.pastPlay.length !== 0 && (this.getNumOff() > 1 || (this.getNumOff() !== 1 && this.state.currentPlay.length === 4))) {
									console.log('num off ' + this.getNumOff());
									console.log('pastplay ' + this.state.pastPlay);
									this.props.headerChange('YOU LOSE');

									this.setState({
										myTurn: false,
										currentPlay: [],
										pastPlay: [],
										inGame: false,
										selectedQueue: []
									});

									// setTimeout(function() {
									// 	this.props.headerChange('new game...your turn');
									// 	this.setState({
									// 		myTurn: true,
									// 		inGame: true
									// 	});
									// }.bind(this), 700);

									this.socket.emit('fail', {move: this.state.currentPlay});

						} else {

									console.log('sending');

									this.socket.emit("sendClick", {play: index});

									if (this.state.currentPlay.length === 4) {

										this.setState({
											currentPlay: [],
											pastPlay: this.state.currentPlay,
											myTurn: false
										});

										this.props.headerChange('valid move...now opponents turn');

									}

						}

					});

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
			<td onClick={this.handleClick.bind(this, this.props.id)} className={(this.props.selected) ? 'selected' : ''}>
				<h1>{this.props.id}</h1>
			</td>
		);
	}
});
var HeaderBoard = React.createClass({
	componentDidMount: function() {
	},
	render: function() {
		return (
			<div className='headerBoard'>
				<div>{(!this.props.inGame) ? this.props.headerText : this.props.currentPlay}</div>
			</div>
		);
	}
});
var TapFour = React.createClass({
	getInitialState: function() {
		return {
			headerText: "Welcome to Tap Four",
		};
	},
	componentDidMount: function() {
		// var that = this;
		// this.socket = io();
		// this.socket.on('comments', function (comments) {
		// 	that.setState({ comments: comments });
		// });
		// this.socket.emit('fetchComments');

	},

	headerChange: function(text) {
		console.log(text);
		this.setState({
			headerText: text
		})
	},

	render: function() {
		return (
			<div>
				<HeaderBoard headerText={this.state.headerText} />
				<GameArea headerChange={this.headerChange} />
			</div>
		);
	}
});


React.render(
	<TapFour/>,
	document.getElementById('content')
);
