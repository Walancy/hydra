import path from "node:path";
import fs from "node:fs";
import { registerEvent } from "../register-event";
import { logger } from "@main/services";

export interface ImportedEpicGame {
  title: string;
  appName: string;
}

const EPIC_MANIFESTS_PATH = process.env.PROGRAMDATA
  ? path.join(
      process.env.PROGRAMDATA,
      "Epic",
      "EpicGamesLauncher",
      "Data",
      "Manifests"
    )
  : "C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests";

const importEpicGames = async (
  _event: Electron.IpcMainInvokeEvent
): Promise<ImportedEpicGame[]> => {
  const games: ImportedEpicGame[] = [];

  try {
    if (!fs.existsSync(EPIC_MANIFESTS_PATH)) {
      logger.info(
        "[ImportEpicGames] Epic Games Launcher manifests folder not found."
      );
      return games;
    }

    const files = await fs.promises.readdir(EPIC_MANIFESTS_PATH);
    const itemFiles = files.filter((f) => f.endsWith(".item"));

    for (const file of itemFiles) {
      try {
        const content = await fs.promises.readFile(
          path.join(EPIC_MANIFESTS_PATH, file),
          "utf-8"
        );
        const manifest = JSON.parse(content);

        // Filter out non-games or engines if necessary
        if (manifest.AppName && manifest.DisplayName) {
          // Epic games often have an AppVersion or an Executable, but simple check is enough
          if (!manifest.AppName.includes("UE_")) {
            // loosely filter out Unreal Engine installations
            games.push({
              title: manifest.DisplayName,
              appName: manifest.AppName,
            });
          }
        }
      } catch (err) {
        logger.warn(`[ImportEpicGames] Failed to parse Epic manifest ${file}`);
      }
    }

    logger.info(`[ImportEpicGames] Found ${games.length} Epic games`);
    return games;
  } catch (error) {
    logger.error("[ImportEpicGames] Failed to scan Epic games", error);
    return [];
  }
};

registerEvent("importEpicGames", importEpicGames);
