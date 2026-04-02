import path from "node:path";
import fs from "node:fs";
import { registerEvent } from "../register-event";
import { logger } from "@main/services";

export interface ImportedSteamGame {
  title: string;
  appId: string;
}

const STEAM_DEFAULT_PATH = String.raw`C:\Program Files (x86)\Steam`;

// Add known steam app ids that are not games (e.g., redistributables, proton) to filter out
const IGNORED_STEAM_APP_IDS = new Set([
  "228980", // Steamworks Common Redistributables
  "1493710", // Proton Experimental
  "1887720", // Proton 7.0
  "2348590", // Proton 8.0
  "2805730", // Proton 9.0
  "1070560", // Steam Linux Runtime
  "1391110", // Steam Linux Runtime - Soldier
  "1628350", // Steam Linux Runtime - Sniper
]);

const getSteamPath = (): string => {
  if (process.platform === "win32") {
    try {
      const { execSync } = require("child_process");
      const output = execSync(
        'reg query "HKCU\\Software\\Valve\\Steam" /v SteamPath',
        { encoding: "utf-8" }
      );
      const match = output.match(/SteamPath\s+REG_SZ\s+(.+)/i);
      if (match && match[1]) {
        return path.normalize(match[1].trim());
      }
    } catch (e) {
      logger.warn(
        "[ImportSteamGames] Could not read Steam path from registry, falling back to default"
      );
    }
  }
  return STEAM_DEFAULT_PATH;
};

const importSteamGames = async (
  _event: Electron.IpcMainInvokeEvent,
  customPath?: string
): Promise<ImportedSteamGame[]> => {
  const games: ImportedSteamGame[] = [];
  try {
    const steamPath = customPath || getSteamPath();

    const libraryFoldersPath = path.join(
      steamPath,
      "steamapps",
      "libraryfolders.vdf"
    );

    // We start with the default path, but we'll try to find any secondary drives in the vdf file
    const scanPaths = [steamPath];

    if (fs.existsSync(libraryFoldersPath)) {
      const content = await fs.promises.readFile(libraryFoldersPath, "utf-8");
      // Find all "path" "D:\\SteamLibrary" entries in the VDF file
      const pathRegex = /"path"\s+"([^"]+)"/gi;
      let match;
      while ((match = pathRegex.exec(content)) !== null) {
        let extractedPath = match[1];
        // vdf might use double backslashes which we need to unescape
        extractedPath = extractedPath.replace(/\\\\/g, "\\");
        if (!scanPaths.includes(extractedPath)) scanPaths.push(extractedPath);
      }
    }

    // Now scan each steamapps folder we found
    for (const libraryPath of scanPaths) {
      const steamAppsPath = path.join(libraryPath, "steamapps");
      if (!fs.existsSync(steamAppsPath)) continue;

      const files = await fs.promises.readdir(steamAppsPath);
      // App manifests are always named appmanifest_<APPID>.acf
      const acfFiles = files.filter(
        (f) => f.startsWith("appmanifest_") && f.endsWith(".acf")
      );

      for (const acfFile of acfFiles) {
        const content = await fs.promises.readFile(
          path.join(steamAppsPath, acfFile),
          "utf-8"
        );
        const appIdMatch = content.match(/"appid"\s+"([^"]+)"/i);
        const nameMatch = content.match(/"name"\s+"([^"]+)"/i);

        if (appIdMatch && nameMatch) {
          const appId = appIdMatch[1];

          // Filter out utility tools and runtime redistributables
          if (IGNORED_STEAM_APP_IDS.has(appId)) continue;

          games.push({
            title: nameMatch[1],
            appId,
          });
        }
      }
    }

    logger.info(`[ImportSteamGames] Found ${games.length} Steam games`);
    return games;
  } catch (error) {
    logger.error("[ImportSteamGames] Failed to scan steam games", error);
    return [];
  }
};

registerEvent("importSteamGames", importSteamGames);
