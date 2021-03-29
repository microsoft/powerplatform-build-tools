
import task = require("azure-pipelines-task-lib/task");
import { PacAuthenticator } from "./PacAuthenticator";

export class AuthHandler {
  private _envUrl!: string;
  private _username!: string;
  private _password!: string;
  private _appId!: string;
  private _clientSecret!: string;
  private _tenantId!: string;
  private _pacAuthenticator: PacAuthenticator;

  constructor(pac: PacAuthenticator) {
    this._pacAuthenticator = pac;
  }

  public async authenticate(authenticationType: string): Promise<void> {
    if (authenticationType === "PowerPlatformEnvironment") {
      task.debug("Using naive implementation for beachhead. REPLACE ME");
      // Need to implemetn API for service endpoint:
      // https://github.com/microsoft/azure-pipelines-task-lib/blob/master/node/docs/azure-pipelines-task-lib.md#taskgetEndpointUrl

      this._envUrl = task.getInput("url", false) as string;
      this._username = task.getInput("username", false) as string;
      this._password = task.getInput("password", false) as string;

      this.authenticateWithUsernamePassword();
    }
  }

  private async authenticateWithUsernamePassword(): Promise<void> {
    await this._pacAuthenticator.authenticateCdsWithUsernamePassword({
      envUrl: this._envUrl,
      username: this._username,
      password: this._password,
    });
  }
}
