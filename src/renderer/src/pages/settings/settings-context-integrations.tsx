import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SettingsDebrid } from "./settings-debrid";
import { SettingsSteamImport } from "./settings-steam-import";
import { SettingsEpicImport } from "./settings-epic-import";
import "./settings-context-integrations.scss";
import "./settings-context-downloads.scss"; // Reuse tab styles

type IntegrationsTab = "debrid" | "launchers";

export function SettingsContextIntegrations() {
  const { t } = useTranslation("settings");
  const [activeTab, setActiveTab] = useState<IntegrationsTab>("debrid");

  const tabs: { id: IntegrationsTab; label: string }[] = [
    {
      id: "debrid",
      label: t("debrid_services", { defaultValue: "Serviços Debrid" }),
    },
    {
      id: "launchers",
      label: t("platform_integrations", {
        defaultValue: "Lojas e Plataformas",
      }),
    },
  ];

  return (
    <div className="downloads-tabs">
      <div className="downloads-tabs__bar" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`downloads-tabs__tab${activeTab === tab.id ? " downloads-tabs__tab--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "debrid" && (
        <div className="settings-context-panel">
          <SettingsDebrid />
        </div>
      )}

      {activeTab === "launchers" && (
        <div className="settings-context-panel">
          <div className="settings-context-integrations__grid">
            <SettingsSteamImport />
            <SettingsEpicImport />
          </div>
        </div>
      )}
    </div>
  );
}
