import { useTranslation } from "react-i18next";
import { SettingsDebrid } from "./settings-debrid";
import "./settings-context-integrations.scss";

export function SettingsContextIntegrations() {
  const { t } = useTranslation("settings");

  return (
    <div className="settings-context-integrations">
      <div className="settings-context-panel">
        <span className="settings-context-panel__section-label">
          {t("debrid_services")}
        </span>
        <SettingsDebrid />
      </div>
    </div>
  );
}
