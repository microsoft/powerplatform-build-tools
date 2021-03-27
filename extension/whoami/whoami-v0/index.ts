import { IWhoAmIParams, getParams } from './whoami'

function run() {
  let params: IWhoAmIParams | undefined = getParams();
  if (params)
    console.log("Hello,", params.AuthenticationType);
}

run();
