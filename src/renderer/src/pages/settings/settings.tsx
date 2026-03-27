import { useTranslation } from "react-i18next";
import {
  SettingsContextConsumer,
  SettingsContextProvider,
} from "@renderer/context";
import { SettingsAccount } from "./settings-account";
import { useUserDetails } from "@renderer/hooks";
import { lazy, Suspense, useMemo } from "react";
import "./settings.scss";
import {
  BellIcon,
  CloudIcon,
  DownloadIcon,
  GearIcon,
  PlayIcon,
  ShieldCheckIcon,
} from "@primer/octicons-react";
import { Wrench } from "lucide-react";
import { SettingsContextGeneral } from "./settings-context-general";
import { SettingsContextDownloads } from "./settings-context-downloads";
import { SettingsContextNotifications } from "./settings-context-notifications";
import { SettingsContextContentGameplay } from "./settings-context-content-gameplay";
import { SettingsContextIntegrations } from "./settings-context-integrations";
import { SettingsContextCompatibility } from "./settings-context-compatibility";
import { SettingsAppearance } from "./appearance/settings-appearance";
import { PaintbrushIcon } from "@primer/octicons-react";

const PixelBlast = lazy(
  () => import("@renderer/components/PixelBlast/PixelBlast")
);

export default function Settings() {
  const { t } = useTranslation("settings");

  const { userDetails } = useUserDetails();

  const categories = useMemo(
    () => [
      {
        id: "general" as const,
        label: t("general"),
        icon: <GearIcon size={16} />,
      },
      {
        id: "appearance" as const,
        label: t("appearance"),
        icon: <PaintbrushIcon size={16} />,
      },
      {
        id: "downloads" as const,
        label: t("downloads"),
        icon: <DownloadIcon size={16} />,
      },
      {
        id: "notifications" as const,
        label: t("notifications"),
        icon: <BellIcon size={16} />,
      },
      {
        id: "content_gameplay" as const,
        label: t("content_gameplay", {
          defaultValue: "Content & gameplay",
        }),
        icon: <PlayIcon size={16} />,
      },
      {
        id: "integrations" as const,
        label: t("integrations", { defaultValue: "Integrations" }),
        icon: <CloudIcon size={16} />,
      },
      {
        id: "compatibility" as const,
        label: t("compatibility", { defaultValue: "Compatibility" }),
        icon: <Wrench size={16} />,
      },
      ...(userDetails
        ? [
            {
              id: "account_privacy" as const,
              label: `${t("account")} & ${t("privacy")}`,
              icon: <ShieldCheckIcon size={16} />,
            },
          ]
        : []),
    ],
    [t, userDetails]
  );

  return (
    <SettingsContextProvider>
      <SettingsContextConsumer>
        {({ currentCategoryId, setCurrentCategoryId, appearance }) => {
          const currentCategory =
            categories.find((category) => category.id === currentCategoryId) ??
            categories[0];
          const selectedCategoryId = currentCategory.id;

          const renderCategory = () => {
            if (selectedCategoryId === "general") {
              return <SettingsContextGeneral />;
            }

            if (selectedCategoryId === "appearance") {
              return <SettingsAppearance appearance={appearance} />;
            }

            if (selectedCategoryId === "downloads") {
              return <SettingsContextDownloads />;
            }

            if (selectedCategoryId === "notifications") {
              return <SettingsContextNotifications />;
            }

            if (selectedCategoryId === "content_gameplay") {
              return <SettingsContextContentGameplay />;
            }

            if (selectedCategoryId === "integrations") {
              return <SettingsContextIntegrations />;
            }

            if (selectedCategoryId === "compatibility") {
              return <SettingsContextCompatibility />;
            }

            return <SettingsAccount />;
          };

          return (
            <>
              <div className="settings__bg-effect">
                <Suspense fallback={null}>
                  <PixelBlast
                    variant="square"
                    pixelSize={3}
                    color="#6366f1"
                    patternScale={3.5}
                    patternDensity={1.6}
                    enableRipples
                    rippleSpeed={0.3}
                    rippleThickness={0.07}
                    rippleIntensityScale={1.2}
                    speed={0.4}
                    transparent
                    edgeFade={0.4}
                  />
                </Suspense>
              </div>

              <section className="settings__container">
                <div className="settings__content">
                  <aside className="settings__sidebar">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        className={`settings__sidebar-button ${
                          currentCategory.id === category.id
                            ? "settings__sidebar-button--active"
                            : ""
                        }`}
                        onClick={() => setCurrentCategoryId(category.id)}
                      >
                        <span className="settings__sidebar-button-icon">
                          {category.icon}
                        </span>
                        <span>{category.label}</span>
                      </button>
                    ))}
                  </aside>

                  <div className="settings__panel">
                    <h2>{currentCategory.label}</h2>
                    {renderCategory()}
                  </div>
                </div>
              </section>
            </>
          );
        }}
      </SettingsContextConsumer>
    </SettingsContextProvider>
  );
}
