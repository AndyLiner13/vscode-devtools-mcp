import React from 'react';

interface CounterProps {
	initial: number;
}

interface CounterState {
	count: number;
}

export class Counter extends React.Component<CounterProps, CounterState> {
	static defaultProps = { initial: 0 };

	state: CounterState = { count: this.props.initial };

	componentDidMount(): void {
		console.log('Counter mounted');
	}

	increment = (): void => {
		this.setState(prev => ({ count: prev.count + 1 }));
	};

	render(): React.ReactNode {
		return (
			<div>
				<span>{this.state.count}</span>
				<button onClick={this.increment}>+</button>
			</div>
		);
	}
}
