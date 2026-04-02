import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@renderer/components";
import { useToast } from "@renderer/hooks/use-toast";
import { DeviceDesktopIcon } from "@primer/octicons-react";
export function SettingsSteamImport() {
  const { t } = useTranslation("settings");
  const { showSuccessToast, showErrorToast } = useToast();
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const games = await window.electron.importSteamGames();

      if (games.length === 0) {
        showErrorToast(t("No Steam games found to import"));
        return;
      }

      let importedCount = 0;
      for (const game of games) {
        await window.electron.addGameToLibrary("steam", game.appId, game.title);
        await window.electron.updateExecutablePath(
          "steam",
          game.appId,
          `steam://rungameid/${game.appId}`
        );
        importedCount++;
      }

      showSuccessToast(
        t("Successfully imported {{count}} Steam games!", {
          count: importedCount,
        })
      );
    } catch (error) {
      showErrorToast(t("Failed to import Steam games"));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="settings-context-integrations__card">
      <div className="settings-context-integrations__card-info">
        <h3 className="settings-context-integrations__card-title">
          <DeviceDesktopIcon />
          Steam
        </h3>
        <p className="settings-context-integrations__card-description">
          {t(
            "Automatically import games installed on your PC via Steam to launch them directly from Hydra."
          )}
        </p>
      </div>

      <div className="settings-context-integrations__card-actions">
        <Button theme="outline" onClick={handleImport} disabled={isImporting}>
          {isImporting ? t("Importing...") : t("Import")}
        </Button>
      </div>
    </div>
  );
}
