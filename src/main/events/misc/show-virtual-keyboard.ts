import { registerEvent } from "../register-event";
import { exec } from "child_process";

const showVirtualKeyboard = async (_event: Electron.IpcMainInvokeEvent) => {
  if (process.platform === "win32") {
    // Try to open the touch keyboard (TabTip.exe) which is native to Windows 10/11
    exec(
      'cmd.exe /c "C:\\Program Files\\Common Files\\microsoft shared\\ink\\TabTip.exe"',
      (error) => {
        if (error) {
          // Fallback to osk.exe if TabTip is unavailable
          exec("osk.exe");
        }
      }
    );
  }
};

registerEvent("showVirtualKeyboard", showVirtualKeyboard);
