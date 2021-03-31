import { PacRunner } from "@microsoft/powerplatform-cli-wrapper";
import AuthenticationType from "./AuthenticationType";
import getAuthenticationType from "./getAuthenticationType";
import getCdsEnvironment from "./getCdsEnvironment";
import getClientCredentials from "./getClientCredentials";
import getUsernamePassword from "./getUsernamePassword";

export default async function authenticateCds(pac: PacRunner): Promise<void> {
  const authenticationType = getAuthenticationType();
  switch (authenticationType) {
    case AuthenticationType.ClientCredentials:
      await pac.authenticateCdsWithClientCredentials({
        ...getClientCredentials(),
        ...getCdsEnvironment(AuthenticationType.ClientCredentials),
      });
      break;
    case AuthenticationType.UsernamePassword:
      await pac.authenticateCdsWithUsernamePassword({
        ...getUsernamePassword(),
        ...getCdsEnvironment(AuthenticationType.UsernamePassword),
      });
      break;
    default:
      throw new Error(`Unsupported authentication type: ${authenticationType}`);
  }
}
