import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@renderer/components";
import { useToast } from "@renderer/hooks/use-toast";
import EpicGamesIcon from "@renderer/assets/launcher-icons/epic-games.svg?react";

export function SettingsEpicImport() {
  const { t } = useTranslation("settings");
  const { showSuccessToast, showErrorToast } = useToast();
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const games = await window.electron.importEpicGames();

      if (games.length === 0) {
        showErrorToast(
          t("No Epic games found to import", {
            defaultValue: "No Epic games found to import",
          })
        );
        return;
      }

      let importedCount = 0;
      for (const game of games) {
        await window.electron.addGameToLibrary(
          "epic",
          game.appName,
          game.title
        );
        
        await window.electron.updateExecutablePath(
          "epic",
          game.appName,
          `com.epicgames.launcher://apps/${game.appName}?action=launch&silent=true`
        );
        importedCount++;
      }

      showSuccessToast(
        t("Successfully imported {{count}} Epic games!", {
          count: importedCount,
          defaultValue: `Successfully imported ${importedCount} Epic games!`,
        })
      );
    } catch (error) {
      showErrorToast(
        t("Failed to import Epic games", {
          defaultValue: "Failed to import Epic games",
        })
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="settings-context-integrations__card">
      <div className="settings-context-integrations__card-info">
        <h3 className="settings-context-integrations__card-title">
          <EpicGamesIcon
            style={{ width: 20, height: 20, fill: "currentColor" }}
          />
          Epic Games
        </h3>
        <p className="settings-context-integrations__card-description">
          {t("import_epic_games_description", {
            defaultValue:
              "Automatically import games installed on your PC via Epic Games to launch them directly from Hydra.",
          })}
        </p>
      </div>

      <div className="settings-context-integrations__card-actions">
        <Button theme="outline" onClick={handleImport} disabled={isImporting}>
          {isImporting
            ? t("Importing...", { defaultValue: "Importing..." })
            : t("Import", { defaultValue: "Import" })}
        </Button>
      </div>
    </div>
  );
}
