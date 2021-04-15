import { resolve } from "path";
import { chmodSync as chmod } from "fs";

const linuxPacCliPath = resolve(__dirname, "bin/pac_linux/tools/pac");
chmod(linuxPacCliPath, 0o711);

setVariable("POWERPLATFORM_BUILD_TOOLS_NODE_MODULES", "node_modules");
setVariable("POWERPLATFORM_BUILD_TOOLS_RUNNERS_DIR", "bin");

function setVariable(name: string, folder: string) {
  console.log(
    `##vso[task.setvariable variable=${name}]${resolve(__dirname, folder)}`
  );
}
