var GameArea = React.createClass({
	getInitialState: function () {
		return {
			inGame: false,
			myTurn: false,
			currentPlay: [],
			pastPlay: [],
			selected: [null, false, false, false, false]
		};
	},
	componentDidMount: function () {

		var that = this;
		this.socket = io();

		this.socket.on('wrongmove', function(data) {
			this.props.headerChange(data.msg);
		}.bind(this));

		this.socket.on('receivemove', function(data) {

			var playSingle = function(num, i) {

				setTimeout(function() {

					var resetselected = [null, false, false, false, false];
					var newselected = resetselected.slice();
					newselected[num] = true;

					this.setState({
						selected: newselected
					});

					setTimeout(function() {
						this.setState({
							selected: resetselected
						});

						if (i === this.state.pastPlay.length-1) {
							this.setState({
								myTurn: true
							});
							this.props.headerChange("your turn");
						}

					}.bind(this), 350);

				}.bind(this), 500 * i);

			};

			this.setState({
				pastPlay: data.play
			});

			data.play.forEach(playSingle.bind(this));

		}.bind(this));


		setTimeout(function() {
			this.props.headerChange('Alright everybody...here we go!');
			setTimeout(function() {
				this.setState({
					inGame: true,
					myTurn: true
				});

			}.bind(this), 1000);

		}.bind(this), 2000);

		// var that = this;
		// this.socket = io();
		// this.socket.on('comments', function (comments) {
		// 	that.setState({ comments: comments });
		// });
		// this.socket.emit('fetchComments');
	},



	handleClick: function(index) {

		if (this.state.inGame && this.state.myTurn) {

					this.setState({
						currentPlay: this.state.currentPlay.concat(index)
					}, function() {

						console.log(this.state.currentPlay);

						if (this.state.pastPlay[this.state.currentPlay.length-1] && index != this.state.pastPlay[this.state.currentPlay.length-1] ) {
									console.log(index + ' and prev ' + this.state.pastPlay[this.state.currentPlay.length-1]);
									this.props.headerChange('YOU LOSE');

									this.setState({
										myTurn: false,
										currentPlay: [],
										pastPlay: [],
										inGame: false
									});

									setTimeout(function() {
										this.props.headerChange('new game...your turn');
										this.setState({
											myTurn: true,
											inGame: true
										});
									}.bind(this), 700);

									this.socket.emit('fail');

						} else if (this.state.currentPlay.length > this.state.pastPlay.length) {

									console.log('sending');

									this.socket.emit("sendplay", {play: this.state.currentPlay});

									this.setState({
										myTurn: false,
										currentPlay: []
									});

									setTimeout(function() {
										this.props.headerChange('Watch for opponent\'s response...');
									}.bind(this), 700);

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
		$("#headerBoard h2").fitText();
	},
	render: function() {
		return (
			<div className='headerBoard'>
				<h2>{(!this.props.inGame) ? this.props.headerText : this.props.currentPlay}</h2>
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
				<GameArea headerChange={this.headerChange} addToPlay={this.addToPlay}/>
			</div>
		);
	}
});


React.render(
	<TapFour/>,
	document.getElementById('content')
);
