import * as React from 'react';
export interface VoteCounterProp {
    Count: number;
}

export class VoteCounter extends React.Component<VoteCounterProp> {

    constructor(props: VoteCounterProp) {
        super(props);
    }

    render() {
        return <div>{this.props.Count}</div>;
    }
}
