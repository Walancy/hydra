import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@renderer/components";
import { SettingsDebrid } from "./settings-debrid";
import { SettingsSteamImport } from "./settings-steam-import";
import "./settings-context-integrations.scss";

export function SettingsContextIntegrations() {
  const { t } = useTranslation("settings");
  const [currentTab, setCurrentTab] = useState<"launchers" | "debrid">("launchers");

  return (
    <div className="settings-context-integrations">
      <ul className="settings-context-integrations__tabs">
        <li className="settings-context-integrations__tabs-item">
          <Button
            theme={currentTab === "launchers" ? "primary" : "outline"}
            onClick={() => setCurrentTab("launchers")}
          >
            Launchers
          </Button>
        </li>
        <li className="settings-context-integrations__tabs-item">
          <Button
            theme={currentTab === "debrid" ? "primary" : "outline"}
            onClick={() => setCurrentTab("debrid")}
          >
            {t("debrid_services")}
          </Button>
        </li>
      </ul>

      {currentTab === "launchers" && (
        <div className="settings-context-panel">
          <span className="settings-context-panel__section-label">Steam</span>
          <SettingsSteamImport />
          
          <div
            className="settings-steam-import"
            style={{
              marginTop: 16,
              opacity: 0.6,
              pointerEvents: "none",
            }}
          >
            <div className="settings-steam-import__info">
              <h3>Epic Games / EA App (Em Breve)</h3>
              <p>{t("Importação automática de outros launchers chegará em breve.")}</p>
            </div>
          </div>
        </div>
      )}

      {currentTab === "debrid" && (
        <div className="settings-context-panel">
          <span className="settings-context-panel__section-label">
            {t("debrid_services")}
          </span>
          <SettingsDebrid />
        </div>
      )}
    </div>
  );
}
