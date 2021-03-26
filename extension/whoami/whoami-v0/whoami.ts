import tl = require("azure-pipelines-task-lib/task");

export interface IWhoAmIParams {
  AuthenticationType: string | undefined;
  PowerPlatformEnvironment: string;
  PowerPlatformSPN: string;
}

export const getParams = (): IWhoAmIParams | undefined => {
  try {
    let result: Partial<IWhoAmIParams> = {};

    result.AuthenticationType = tl.getInput('authenticationType', true);
    if (result.AuthenticationType == 'bad') {
      tl.setResult(tl.TaskResult.Failed, 'Bad input was given');
      return undefined;
    }

    result.PowerPlatformEnvironment = tl.getInput('PowerPlatformEnvironment', true);
    if (!result.PowerPlatformEnvironment) {
      tl.setResult(tl.TaskResult.Failed, 'Bad input was given');
      return undefined;
    }

    result.PowerPlatformSPN = tl.getInput('PowerPlatformSPN', true);
    if (!result.PowerPlatformSPN) {
      tl.setResult(tl.TaskResult.Failed, 'Bad input was given');
      return undefined;
    }

    return result as IWhoAmIParams;
  }
  catch (err) {
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}

