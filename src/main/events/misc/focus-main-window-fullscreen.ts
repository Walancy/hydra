import { registerEvent } from "../register-event";
import { WindowManager } from "@main/services";

const focusMainWindowFullscreen = async () => {
  WindowManager.focusMainWindowFullscreen();
};

registerEvent("focusMainWindowFullscreen", focusMainWindowFullscreen);
