import { DevOpsOptions } from "@microsoft/powerplatform-cli-wrapper";
import getAuthenticationType from "./getAuthenticationType";
import { cwd, getEndpointUrl } from "azure-pipelines-task-lib";
import getClientCredentials from "./getClientCredentials";
import getPacCliPath from "./getPacCliPath";
import getExePath from "./getExePath";
import getUsernamePassword from "./getUsernamePassword";
import logger from "./logger";

const devOpsOptions: DevOpsOptions = {
  getAuthenticationType: getAuthenticationType,
  getCdsEnvironment: () => ({
    envUrl: getEndpointUrl("PowerPlatformEnvironment", false),
  }),
  getClientCredentials: getClientCredentials,
  getPacCliPath: getPacCliPath,
  getSopaPath: () =>
    getExePath("sopa", "content", "bin", "coretools", "CrmSvcUtil.exe"),
  getUsernamePassword: getUsernamePassword,
  getWorkingDir: () => cwd(),
  logger: logger,
};

export default devOpsOptions;
