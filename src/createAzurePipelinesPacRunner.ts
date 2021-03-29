import {
  createPacRunner,
  PacRunner,
} from "@microsoft/powerplatform-cli-wrapper";
import { cwd } from "process";
import { platform } from "os";
import { TaskLogger } from "./taskLogger";
import getExePath from "./getExePath";

export default function createAzurePipelinesPacRunner(): PacRunner {
  return createPacRunner(
    cwd(),
    platform() === "win32"
      ? getExePath("pac", "tools", "pac.exe")
      : getExePath("pac_linux", "tools", "pac"),
    new TaskLogger()
  );
}
