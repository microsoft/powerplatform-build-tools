import {
  createPacRunner,
  PacRunner,
} from "@microsoft/powerplatform-cli-wrapper";
import { cwd } from "process";
import { platform } from "os";
import { ActionLogger } from "./taskLogger";
import getExePath from "./getExePath";

export default function createActionsPacRunner(): PacRunner {
  return createPacRunner(
      cwd(),
      (platform() === "win32"
          ? getExePath("pac", "tools", "pac.exe")
          : getExePath("pac_linux", "tools", "pac")),
      new ActionLogger()
  );
}
