import path from "node:path";
import fs from "node:fs";
import { registerEvent } from "../register-event";
import { gamesSublevel, levelKeys } from "@main/level";
import { GameExecutables, WindowManager, logger } from "@main/services";

interface ImportedGame {
  title: string;
  executablePath: string;
}

async function findExecutableInFolder(
  folderPath: string,
  executableNames: Set<string>
): Promise<string | null> {
  try {
    const entries = await fs.promises.readdir(folderPath, {
      withFileTypes: true,
      recursive: true,
    });

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const fileName = entry.name.toLowerCase();
      if (executableNames.has(fileName)) {
        const parentPath =
          "parentPath" in entry ? entry.parentPath : folderPath;
        return path.join(parentPath, entry.name);
      }
    }
  } catch (err) {
    logger.error(
      `[ImportGamesFromFolder] Error reading folder ${folderPath}:`,
      err
    );
  }
  return null;
}

const importGamesFromFolder = async (
  _event: Electron.IpcMainInvokeEvent,
  folderPath: string
): Promise<{ importedGames: ImportedGame[]; total: number }> => {
  if (!fs.existsSync(folderPath)) {
    return { importedGames: [], total: 0 };
  }

  const games = await gamesSublevel
    .iterator()
    .all()
    .then((results) =>
      results
        .filter(
          ([_key, game]) => game.isDeleted === false && game.shop !== "custom"
        )
        .map(([key, game]) => ({ key, game }))
    );

  const gamesToScan = games.filter((g) => !g.game.executablePath);
  const importedGames: ImportedGame[] = [];

  for (const { key, game } of gamesToScan) {
    const executableNames = GameExecutables.getExecutablesForGame(
      game.objectId
    );
    if (!executableNames || executableNames.length === 0) continue;

    const normalizedNames = new Set(
      executableNames.map((name) => name.toLowerCase())
    );

    const foundPath = await findExecutableInFolder(folderPath, normalizedNames);

    if (foundPath) {
      await gamesSublevel.put(key, { ...game, executablePath: foundPath });
      logger.info(
        `[ImportGamesFromFolder] Linked ${game.title} → ${foundPath}`
      );
      importedGames.push({ title: game.title, executablePath: foundPath });
    }
  }

  if (importedGames.length > 0) {
    WindowManager.mainWindow?.webContents.send("on-library-batch-complete");
  }

  return { importedGames, total: gamesToScan.length };
};

registerEvent("importGamesFromFolder", importGamesFromFolder);
