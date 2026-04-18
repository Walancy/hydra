import path from "node:path";
import fs from "node:fs";
import { registerEvent } from "../register-event";
import { logger } from "@main/services";

export interface ImportedEpicGame {
  title: string;
  appName: string;
  installLocation?: string;
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

const NON_GAME_PREFIXES = ["UE_", "EpicGamesLauncher", "Unreal"];
const NON_GAME_CATEGORIES = ["engines", "applications"];

const isGameManifest = (manifest: Record<string, unknown>): boolean => {
  const appName = String(manifest.AppName ?? "");
  const category = String(manifest.AppCategories ?? "").toLowerCase();

  if (NON_GAME_PREFIXES.some((prefix) => appName.startsWith(prefix))) {
    return false;
  }

  if (NON_GAME_CATEGORIES.some((cat) => category.includes(cat))) {
    return false;
  }

  return Boolean(manifest.AppName && manifest.DisplayName);
};

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

    logger.info(`[ImportEpicGames] Found ${itemFiles.length} manifest files`);

    for (const file of itemFiles) {
      try {
        const content = await fs.promises.readFile(
          path.join(EPIC_MANIFESTS_PATH, file),
          "utf-8"
        );
        const manifest = JSON.parse(content) as Record<string, unknown>;

        if (isGameManifest(manifest)) {
          games.push({
            title: String(manifest.DisplayName),
            appName: String(manifest.AppName),
            installLocation: manifest.InstallLocation
              ? String(manifest.InstallLocation)
              : undefined,
          });
          logger.info(
            `[ImportEpicGames] Found game: ${manifest.DisplayName} (${manifest.AppName})`
          );
        } else {
          logger.info(
            `[ImportEpicGames] Skipping non-game: ${manifest.AppName}`
          );
        }
      } catch (err) {
        logger.warn(
          `[ImportEpicGames] Failed to parse Epic manifest ${file}: ${err}`
        );
      }
    }

    logger.info(`[ImportEpicGames] Total games to import: ${games.length}`);
    return games;
  } catch (error) {
    logger.error("[ImportEpicGames] Failed to scan Epic games", error);
    return [];
  }
};

registerEvent("importEpicGames", importEpicGames);
