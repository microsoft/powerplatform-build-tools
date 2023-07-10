/*
*This is auto generated from the ControlManifest.Input.xml file
*/

// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
  SignalRUrl: ComponentFramework.PropertyTypes.StringProperty;
  BallotId: ComponentFramework.PropertyTypes.StringProperty;
  VoteItems: ComponentFramework.PropertyTypes.DataSet;
}
export interface IOutputs {
  VoteCount?: number;
  LastUpdate?: Date;
}
