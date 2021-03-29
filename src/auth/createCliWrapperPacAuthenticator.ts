import { PacAuthenticator } from "./PacAuthenticator";
import {
    PacRunner,
    ClientCredentials,
    CdsEnvironment,
    UsernamePassword,
} from "@microsoft/powerplatform-cli-wrapper";

export default function createCliWrapperPacAuthenticator(
    pac: PacRunner
): PacAuthenticator {
    return {
        authenticateCdsWithClientCredentials: async (
            parameters: ClientCredentials & CdsEnvironment
        ) => {
            await pac.clearAuthenticationProfiles();
            await pac.authenticateCdsWithClientCredentials(parameters);
        },
        authenticateAdminWithClientCredentials: async (
            parameters: ClientCredentials
        ) => {
            await pac.clearAuthenticationProfiles();
            await pac.authenticateAdminWithClientCredentials(parameters);
        },
        authenticateCdsWithUsernamePassword: async (
            parameters: UsernamePassword & CdsEnvironment
        ) => {
            await pac.clearAuthenticationProfiles();
            await pac.authenticateCdsWithUsernamePassword(parameters);
        },
        authenticateAdminWithUsernamePassword: async (
            parameters: UsernamePassword
        ) => {
            await pac.clearAuthenticationProfiles();
            await pac.authenticateAdminWithUsernamePassword(parameters);
        },
    };
}
