import { registerEvent } from "../register-event";
import { WindowManager } from "@main/services";

const showForzaAchievementTestNotification = async (
  _event: Electron.IpcMainInvokeEvent
) => {
  setTimeout(() => {
    WindowManager.showForzaAchievementTestNotification();
  }, 1000);
};

registerEvent(
  "showForzaAchievementTestNotification",
  showForzaAchievementTestNotification
);
