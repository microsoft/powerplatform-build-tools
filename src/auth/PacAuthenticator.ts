import {
  ClientCredentials,
  CdsEnvironment,
  UsernamePassword,
} from "@microsoft/powerplatform-cli-wrapper";

export interface PacAuthenticator {
  authenticateCdsWithClientCredentials(
      parameters: ClientCredentials & CdsEnvironment
  ): Promise<void>;
  authenticateAdminWithClientCredentials(
      parameters: ClientCredentials
  ): Promise<void>;
  authenticateCdsWithUsernamePassword(
      parameters: UsernamePassword & CdsEnvironment
  ): Promise<void>;
  authenticateAdminWithUsernamePassword(
      parameters: UsernamePassword
  ): Promise<void>;
}
