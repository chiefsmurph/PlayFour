var React = require('react');

var OdometerComponent = React.createClass({
  componentDidMount: function(){
     this.odometer = new Odometer({
      el: this.getDOMNode(),
      value: this.props.value,
      theme: 'minimal',
      duration: 300,
      format: ''
    });
  },
  componentDidUpdate: function() {
   this.odometer.update(this.props.value)
  },
  render: function() {
    return React.DOM.div()
  }
})

module.exports = OdometerComponent;
