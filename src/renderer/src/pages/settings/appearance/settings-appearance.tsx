import { useCallback, useContext, useEffect, useState } from "react";
import "./settings-appearance.scss";
import { ThemeActions, ThemeCard, ThemePlaceholder } from "./index";
import type { Theme } from "@types";
import { ImportThemeModal } from "./modals/import-theme-modal";
import { settingsContext } from "@renderer/context";
import { useNavigate } from "react-router-dom";
import { levelDBService } from "@renderer/services/leveldb.service";
import { THEME_WEB_STORE_URL } from "@renderer/constants";
import { useTranslation } from "react-i18next";
import { BackgroundEffectSettings } from "./background-effect-settings";

interface SettingsAppearanceProps {
  appearance: {
    theme: string | null;
    authorId: string | null;
    authorName: string | null;
  };
}

type ThemeTab = "mine" | "installed" | "effects";

export function SettingsAppearance({
  appearance,
}: Readonly<SettingsAppearanceProps>) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [activeTab, setActiveTab] = useState<ThemeTab>("mine");
  const [isImportThemeModalVisible, setIsImportThemeModalVisible] =
    useState(false);
  const [importTheme, setImportTheme] = useState<{
    theme: string;
    authorId: string;
    authorName: string;
  } | null>(null);
  const [hasShownModal, setHasShownModal] = useState(false);

  const { t } = useTranslation("settings");
  const { clearTheme } = useContext(settingsContext);
  const navigate = useNavigate();

  const loadThemes = useCallback(async () => {
    const themesList = (await levelDBService.values("themes")) as Theme[];
    setThemes(themesList);
  }, []);

  useEffect(() => {
    loadThemes();
  }, [loadThemes]);

  useEffect(() => {
    const unsubscribe = window.electron.onCustomThemeUpdated(() => {
      loadThemes();
    });

    return () => unsubscribe();
  }, [loadThemes]);

  useEffect(() => {
    if (
      appearance.theme &&
      appearance.authorId &&
      appearance.authorName &&
      !hasShownModal
    ) {
      setIsImportThemeModalVisible(true);
      setImportTheme({
        theme: appearance.theme,
        authorId: appearance.authorId,
        authorName: appearance.authorName,
      });
      setHasShownModal(true);

      navigate("/settings", { replace: true });
      clearTheme();
    }
  }, [
    appearance.theme,
    appearance.authorId,
    appearance.authorName,
    navigate,
    hasShownModal,
    clearTheme,
  ]);

  const onThemeImported = useCallback(() => {
    setIsImportThemeModalVisible(false);
    setImportTheme(null);
    loadThemes();
  }, [loadThemes]);

  const isInstalledTheme = (theme: Theme) =>
    theme.code.startsWith(THEME_WEB_STORE_URL);

  const sortedThemes = [...themes].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const myThemes = sortedThemes.filter((th) => !isInstalledTheme(th));
  const installedThemes = sortedThemes.filter((th) => isInstalledTheme(th));
  const visibleThemes = activeTab === "mine" ? myThemes : installedThemes;

  const tabs: { id: ThemeTab; label: string; count: number }[] = [
    {
      id: "mine",
      label: t("my_themes", { defaultValue: "Meus Temas" }),
      count: myThemes.length,
    },
    {
      id: "installed",
      label: t("installed_themes", { defaultValue: "Instalados" }),
      count: installedThemes.length,
    },
    {
      id: "effects",
      label: "Fundos Animados",
      count: 0,
    },
  ];

  return (
    <div className="settings-context-panel">
      <div className="settings-context-panel__group settings-appearance">
        <ThemeActions onListUpdated={loadThemes} themesCount={themes.length} />

        <div className="settings-appearance__tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`settings-appearance__tab ${activeTab === tab.id ? "settings-appearance__tab--active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="settings-appearance__tab-count">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "effects" ? (
          <div className="settings-appearance__effects-container">
            <BackgroundEffectSettings />
          </div>
        ) : (
          <div className="settings-appearance__themes">
            {!visibleThemes.length ? (
              activeTab === "mine" ? (
                <ThemePlaceholder onListUpdated={loadThemes} />
              ) : (
                <div className="settings-appearance__empty-state">
                  <p>
                    {t("no_installed_themes", {
                      defaultValue:
                        "Nenhum tema instalado. Visite a loja para instalar temas.",
                    })}
                  </p>
                </div>
              )
            ) : (
              visibleThemes.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  onListUpdated={loadThemes}
                />
              ))
            )}
          </div>
        )}
      </div>

      {importTheme && (
        <ImportThemeModal
          visible={isImportThemeModalVisible}
          onClose={() => {
            setIsImportThemeModalVisible(false);
            clearTheme();
            setHasShownModal(false);
          }}
          onThemeImported={onThemeImported}
          themeName={importTheme.theme}
          authorId={importTheme.authorId}
          authorName={importTheme.authorName}
        />
      )}
    </div>
  );
}
