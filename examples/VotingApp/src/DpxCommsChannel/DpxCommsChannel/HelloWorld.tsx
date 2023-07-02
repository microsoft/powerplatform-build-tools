import * as React from 'react';
import * as FluentUI from '@fluentui/react';

export interface IHelloWorldProps {
  name?: string;
}

export class HelloWorld extends React.Component<IHelloWorldProps> {
  public render(): React.ReactNode {
    return (
      <FluentUI.Label>
        {this.props.name}
      </FluentUI.Label>
    )
  }
}
