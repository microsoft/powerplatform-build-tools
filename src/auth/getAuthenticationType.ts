import task = require("azure-pipelines-task-lib/task");
import AuthenticationType from "./AuthenticationType";

export default function getAuthenticationType(): AuthenticationType {
  return task.getInput("authenticationType") as AuthenticationType;
}
