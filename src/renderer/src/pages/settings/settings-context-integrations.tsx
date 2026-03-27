import { useTranslation } from "react-i18next";
import { SettingsDebrid } from "./settings-debrid";

export function SettingsContextIntegrations() {
  const { t } = useTranslation("settings");

  return (
    <div className="settings-context-panel">
      <span className="settings-context-panel__section-label">
        {t("debrid_services")}
      </span>
      <SettingsDebrid />
    </div>
  );
}

