import { resolve } from "path";

setVariable("POWERPLATFORM_BUILD_TOOLS_NODE_MODULES", "node_modules");
setVariable("POWERPLATFORM_BUILD_TOOLS_RUNNERS_DIR", "bin");

function setVariable(name: string, folder: string) {
  console.log(
    `##vso[task.setvariable variable=${name}]${resolve(__dirname, folder)}`
  );
}
