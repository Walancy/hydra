import { useCallback, useEffect, useRef, useState } from "react";
import {
  Sidebar,
  BottomPanel,
  Header,
  Toast,
  Modal,
} from "@renderer/components";
import HydraIcon from "@renderer/assets/icons/hydra.svg?react";
import { WorkWonders } from "workwonders-sdk";
import {
  useAppDispatch,
  useAppSelector,
  useDownload,
  useLibrary,
  useToast,
  useUserDetails,
  useBackgroundMusic,
} from "@renderer/hooks";
import { useDownloadOptionsListener } from "@renderer/hooks/use-download-options-listener";
import { useGlobalGamepadNavigation } from "@renderer/hooks/use-global-gamepad-navigation";

import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  setUserPreferences,
  toggleDraggingDisabled,
  closeToast,
  setUserDetails,
  setProfileBackground,
  setGameRunning,
  setExtractionProgress,
  clearExtraction,
} from "@renderer/features";
import { useTranslation } from "react-i18next";
import { useSubscription } from "./hooks/use-subscription";
import { HydraCloudModal } from "./pages/shared-modals/hydra-cloud/hydra-cloud-modal";
import { ArchiveDeletionModal } from "./pages/downloads/archive-deletion-error-modal";
import { SettingsAppearance } from "@renderer/pages/settings/appearance/settings-appearance";

import {
  injectCustomCss,
  removeCustomCss,
  getAchievementSoundUrl,
  getAchievementSoundVolume,
} from "./helpers";
import { levelDBService } from "./services/leveldb.service";
import type { UserPreferences } from "@types";
import cn from "classnames";
import { BackgroundEffectRenderer } from "./components/react-bits/BackgroundEffectRenderer";
import "react-loading-skeleton/dist/skeleton.css";
import "./app.scss";

export interface AppProps {
  children: React.ReactNode;
}

type WorkWondersWithKnowledge = WorkWonders & {
  knowledge?: {
    initKnowledgeWidget?: () => void;
    showArticle?: (articleId: number) => void;
  };
};

export function App() {
  const contentRef = useRef<HTMLDivElement>(null);
  const { updateLibrary, library } = useLibrary();

  useGlobalGamepadNavigation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "F11") return;
      e.preventDefault();
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const [isSidebarForceOpen, setIsSidebarForceOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);

  const handleSidebarEnter = useCallback(() => setIsSidebarHovered(true), []);
  const handleSidebarLeave = useCallback(() => {
    setIsSidebarHovered(false);
    setIsSidebarForceOpen(false);
  }, []);

  // Listen for new download options updates
  useDownloadOptionsListener();

  const { t } = useTranslation("app");

  const { clearDownload, setLastPacket } = useDownload();

  const workwondersRef = useRef<WorkWonders | null>(null);

  const { fetchUserDetails, updateUserDetails, clearUserDetails } =
    useUserDetails();

  const { hideHydraCloudModal, isHydraCloudModalVisible, hydraCloudFeature } =
    useSubscription();

  const dispatch = useAppDispatch();

  const navigate = useNavigate();
  const location = useLocation();

  const draggingDisabled = useAppSelector(
    (state) => state.window.draggingDisabled
  );

  const toast = useAppSelector((state) => state.toast);

  const { showSuccessToast, showErrorToast } = useToast();

  const [showArchiveDeletionModal, setShowArchiveDeletionModal] =
    useState(false);
  const [archivePaths, setArchivePaths] = useState<string[]>([]);

  const userPreferences = useAppSelector(
    (state) => state.userPreferences.value
  );
  const musicEnabled = userPreferences?.backgroundMusicEnabled ?? false;
  const musicVolume = userPreferences?.backgroundMusicVolume ?? 0.15;

  useBackgroundMusic(musicEnabled, musicVolume);

  useEffect(() => {
    Promise.all([
      levelDBService.get("userPreferences", null, "json"),
      updateLibrary(),
    ]).then(([preferences]) => {
      dispatch(setUserPreferences(preferences as UserPreferences | null));
    });
  }, [navigate, location.pathname, dispatch, updateLibrary]);

  useEffect(() => {
    const unsubscribe = window.electron.onDownloadProgress(
      (downloadProgress) => {
        if (downloadProgress?.progress === 1) {
          clearDownload();
          updateLibrary();
          return;
        }

        setLastPacket(downloadProgress);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [clearDownload, setLastPacket, updateLibrary]);

  useEffect(() => {
    const unsubscribe = window.electron.onHardDelete(() => {
      updateLibrary();
    });

    return () => unsubscribe();
  }, [updateLibrary]);

  const setupWorkWonders = useCallback(
    async (token?: string, locale?: string) => {
      if (workwondersRef.current) return;

      workwondersRef.current = new WorkWonders();

      const possibleLocales = ["en", "pt", "ru"];

      const parsedLocale =
        possibleLocales.find((l) => l === locale?.slice(0, 2)) ?? "en";

      await workwondersRef.current.init({
        organization: "hydra",
        token,
        locale: parsedLocale,
      });

      workwondersRef.current.changelog.initChangelogWidget();
      workwondersRef.current.changelog.initChangelogWidgetMini();
      const workWondersWithKnowledge =
        workwondersRef.current as WorkWondersWithKnowledge;
      workWondersWithKnowledge.knowledge?.initKnowledgeWidget?.();

      if (token) {
        workwondersRef.current.feedback.initFeedbackWidget();
      }
    },
    [workwondersRef]
  );

  useEffect(() => {
    const onClick = async (event: MouseEvent) => {
      const userPreferences = await window.electron.getUserPreferences();
      const language = userPreferences?.language ?? "en";

      const articleMapping = {
        pt: {
          "cannot-write-directory": 1429,
          seeding: 1442,
          "peers-and-seeds": 1449,
          "steam-achievements": 1412,
        },
        en: {
          "cannot-write-directory": 4122,
          seeding: 4116,
          "peers-and-seeds": 4119,
          "steam-achievements": 4140,
        },
      };

      const $helpCenterTarget = (event.target as HTMLElement).closest(
        "[data-open-article]"
      );

      if ($helpCenterTarget) {
        const article = $helpCenterTarget.getAttribute("data-open-article");
        const articleId =
          articleMapping[language.slice(0, 2)]?.[
            article as keyof typeof articleMapping
          ] ?? articleMapping["en"]?.[article as keyof typeof articleMapping];

        if (articleId) {
          const workWondersWithKnowledge =
            workwondersRef.current as WorkWondersWithKnowledge | null;
          workWondersWithKnowledge?.knowledge?.showArticle?.(articleId);
        }
      }
    };

    window.addEventListener("click", onClick);

    return () => {
      window.removeEventListener("click", onClick);
    };
  }, []);

  const setupExternalResources = useCallback(async () => {
    const cachedUserDetails = window.localStorage.getItem("userDetails");

    if (cachedUserDetails) {
      const { profileBackground, ...userDetails } =
        JSON.parse(cachedUserDetails);

      dispatch(setUserDetails(userDetails));
      dispatch(setProfileBackground(profileBackground));
    }

    const userPreferences = await window.electron.getUserPreferences();
    const userDetails = await fetchUserDetails().catch(() => null);

    if (userDetails) {
      updateUserDetails(userDetails);
    }

    setupWorkWonders(userDetails?.workwondersJwt, userPreferences?.language);

    if (!document.getElementById("external-resources")) {
      const $script = document.createElement("script");
      $script.id = "external-resources";
      $script.src = `${import.meta.env.RENDERER_VITE_EXTERNAL_RESOURCES_URL}/bundle.js?t=${Date.now()}`;
      document.head.appendChild($script);
    }
  }, [fetchUserDetails, updateUserDetails, dispatch, setupWorkWonders]);

  useEffect(() => {
    setupExternalResources();
  }, [setupExternalResources]);

  const onSignIn = useCallback(() => {
    fetchUserDetails().then((response) => {
      if (response) {
        updateUserDetails(response);
        showSuccessToast(t("successfully_signed_in"));
      }
    });
  }, [fetchUserDetails, t, showSuccessToast, updateUserDetails]);

  useEffect(() => {
    const unsubscribe = window.electron.onGamesRunning((gamesRunning) => {
      if (gamesRunning.length) {
        const lastGame = gamesRunning[gamesRunning.length - 1];
        const libraryGame = library.find(
          (library) => library.id === lastGame.id
        );

        if (libraryGame) {
          dispatch(
            setGameRunning({
              ...libraryGame,
              sessionDurationInMillis: lastGame.sessionDurationInMillis,
            })
          );
          return;
        }
      }
      dispatch(setGameRunning(null));
    });

    return () => {
      unsubscribe();
    };
  }, [dispatch, library]);

  useEffect(() => {
    const listeners = [
      window.electron.onSignIn(onSignIn),
      window.electron.onLibraryBatchComplete(() => {
        updateLibrary();
      }),
      window.electron.onSignOut(() => clearUserDetails()),
      window.electron.onExtractionProgress((shop, objectId, progress) => {
        dispatch(setExtractionProgress({ shop, objectId, progress }));
      }),
      window.electron.onExtractionComplete(() => {
        dispatch(clearExtraction());
        updateLibrary();
      }),
      window.electron.onExtractionFailed(() => {
        dispatch(clearExtraction());
        updateLibrary();
        showErrorToast(
          t("extraction_failed_title", { ns: "downloads" }),
          t("extraction_failed_description", { ns: "downloads" })
        );
      }),
      window.electron.onArchiveDeletionPrompt((paths) => {
        setArchivePaths(paths);
        setShowArchiveDeletionModal(true);
      }),
    ];

    return () => {
      listeners.forEach((unsubscribe) => unsubscribe());
    };
  }, [onSignIn, updateLibrary, clearUserDetails, dispatch, showErrorToast, t]);

  useEffect(() => {
    const asyncScrollAndNotify = async () => {
      if (contentRef.current) contentRef.current.scrollTop = 0;
      await workwondersRef.current?.notifyUrlChange?.();
    };
    asyncScrollAndNotify();
  }, [location.pathname, location.search]);

  useEffect(() => {
    new MutationObserver(() => {
      const modal = document.body.querySelector("[data-hydra-dialog]");

      dispatch(toggleDraggingDisabled(Boolean(modal)));
    }).observe(document.body, {
      attributes: false,
      childList: true,
    });
  }, [dispatch, draggingDisabled]);

  const loadAndApplyTheme = useCallback(async () => {
    const allThemes = (await levelDBService.values("themes")) as {
      isActive?: boolean;
      code?: string;
    }[];
    const activeTheme = allThemes.find((theme) => theme.isActive);
    if (activeTheme?.code) {
      injectCustomCss(activeTheme.code);
    } else {
      removeCustomCss();
    }
  }, []);

  useEffect(() => {
    loadAndApplyTheme();
  }, [loadAndApplyTheme]);

  useEffect(() => {
    const unsubscribe = window.electron.onCustomThemeUpdated(() => {
      loadAndApplyTheme();
    });

    return () => unsubscribe();
  }, [loadAndApplyTheme]);

  const playAudio = useCallback(async () => {
    const soundUrl = await getAchievementSoundUrl();
    const volume = await getAchievementSoundVolume();
    const audio = new Audio(soundUrl);
    audio.volume = volume;
    audio.play();
  }, []);

  useEffect(() => {
    const unsubscribe = window.electron.onAchievementUnlocked(() => {
      playAudio();
    });

    return () => {
      unsubscribe();
    };
  }, [playAudio]);

  const handleToastClose = useCallback(() => {
    dispatch(closeToast());
  }, [dispatch]);

  return (
    <>
      {window.electron.platform === "win32" && (
        <div className="title-bar" data-gamepad-ignore="true">
          <HydraIcon className="title-bar__logo" aria-hidden="true" />
          {!isSidebarHovered && !isSidebarForceOpen && (
            <div className="title-bar__options">
              <button
                type="button"
                className="title-bar__option"
                onClick={() => setIsSidebarForceOpen(true)}
              >
                Menu
              </button>
              <button
                type="button"
                className="title-bar__option"
                onClick={() => window.electron.scanInstalledGames()}
              >
                Importar
              </button>
              <button
                type="button"
                className="title-bar__option"
                onClick={() => setShowThemeModal(true)}
              >
                Tema
              </button>
              <button
                type="button"
                className="title-bar__option"
                onClick={() => (window.electron as any).openDevTools()}
              >
                DevTools
              </button>
            </div>
          )}
        </div>
      )}

      <Modal
        visible={showThemeModal}
        title="Gerenciar Temas"
        onClose={() => setShowThemeModal(false)}
        large
      >
        <div style={{ height: "450px", overflow: "hidden" }}>
          <SettingsAppearance
            appearance={{ theme: null, authorId: null, authorName: null }}
          />
        </div>
      </Modal>

      <Toast
        visible={toast.visible}
        title={toast.title}
        message={toast.message}
        type={toast.type}
        onClose={handleToastClose}
        duration={toast.duration}
      />

      <HydraCloudModal
        visible={isHydraCloudModalVisible}
        onClose={hideHydraCloudModal}
        feature={hydraCloudFeature}
      />

      <ArchiveDeletionModal
        visible={showArchiveDeletionModal}
        archivePaths={archivePaths}
        onClose={() => setShowArchiveDeletionModal(false)}
      />

      <main>
        <BackgroundEffectRenderer />
        <div
          className={cn("sidebar-wrapper", {
            "sidebar-wrapper--force-open": isSidebarForceOpen,
          })}
          onMouseEnter={handleSidebarEnter}
          onMouseLeave={handleSidebarLeave}
        >
          <Sidebar />
        </div>

        <article className="container">
          <Header />

          <section
            ref={contentRef}
            id="scrollableDiv"
            className="container__content"
          >
            <Outlet />
          </section>
        </article>
      </main>

      <BottomPanel />
    </>
  );
}
