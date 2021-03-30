import { platform } from "os";
import getExePath from "./getExePath";

export default function getPacCliPath(): string {
  return platform() === "win32"
    ? getExePath("pac", "tools", "pac.exe")
    : getExePath("pac_linux", "tools", "pac");
}
