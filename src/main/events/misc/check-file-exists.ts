import fs from "node:fs";
import { registerEvent } from "../register-event";

const checkFileExists = async (
  _event: Electron.IpcMainInvokeEvent,
  filePath: string
): Promise<boolean> => {
  return fs.existsSync(filePath);
};

registerEvent("checkFileExists", checkFileExists);
