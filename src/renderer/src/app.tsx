import { useCallback, useEffect, useRef, useState } from "react";
import {
  Sidebar,
  BottomPanel,
  Header,
  Toast,
  Modal,
  GamepadGuide,
  SplashScreen,
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
import { useGamepad, useGamepadConnected } from "@renderer/hooks/use-gamepad";

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
import { SettingsAppearance } from "./pages/settings/appearance/settings-appearance";

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
  const isGamepadConnected = useGamepadConnected();

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
  const [showSplash, setShowSplash] = useState(true);

  const handleSidebarEnter = useCallback(() => setIsSidebarHovered(true), []);
  const handleSidebarLeave = useCallback(() => {
    setIsSidebarHovered(false);
    setIsSidebarForceOpen(false);
  }, []);

  useGamepad({
    priority: 3,
    onButton: {
      B: () => {
        if (location.pathname !== "/") {
          navigate(-1);
          return true; // Consume
        }
        return false;
      },
      BACK: () => {
        window.dispatchEvent(new CustomEvent("hydra:close-notifications"));
        setIsSidebarForceOpen((prev) => !prev);
        return true;
      },
      START: () => {
        setIsSidebarForceOpen(false);
        window.dispatchEvent(new CustomEvent("hydra:open-notifications"));
        return true;
      },
    },
  });

  useEffect(() => {
    const handleTestSplash = () => setShowSplash(true);
    const handleCloseSidebar = () => setIsSidebarForceOpen(false);

    window.addEventListener("hydra:test-splash", handleTestSplash);
    window.addEventListener(
      "hydra:close-sidebar",
      handleCloseSidebar as EventListener
    );

    return () => {
      window.removeEventListener("hydra:test-splash", handleTestSplash);
      window.removeEventListener(
        "hydra:close-sidebar",
        handleCloseSidebar as EventListener
      );
    };
  }, []);

  useEffect(() => {
    if (isSidebarForceOpen && isGamepadConnected) {
      setTimeout(() => {
        const firstSidebarLink = document.querySelector(".sidebar__nav-link");
        if (firstSidebarLink) {
          (firstSidebarLink as HTMLElement).focus({ preventScroll: false });
        }
      }, 50);
    }
  }, [isSidebarForceOpen, isGamepadConnected]);

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
    let initialUserId = "";

    if (cachedUserDetails) {
      const { profileBackground, ...userDetails } =
        JSON.parse(cachedUserDetails);
      initialUserId = userDetails.id;

      dispatch(setUserDetails(userDetails));
      dispatch(setProfileBackground(profileBackground));
    }

    const userPreferences = await window.electron.getUserPreferences();
    const userDetails = await fetchUserDetails().catch(() => null);

    if (userDetails) {
      updateUserDetails(userDetails);
      initialUserId = userDetails.id;
    }

    setupWorkWonders(userDetails?.workwondersJwt, userPreferences?.language);

    if (!document.getElementById("external-resources")) {
      const $script = document.createElement("script");
      $script.id = "external-resources";
      $script.src = `${import.meta.env.RENDERER_VITE_EXTERNAL_RESOURCES_URL}/bundle.js?t=${Date.now()}`;
      document.head.appendChild($script);
    }

    setTimeout(async () => {
      try {
        if ((window as any).__HYDRA_CATALOGUE_CACHE__) return;
        const sources = (await window.electron.leveldb.values(
          "downloadSources"
        )) as any[];
        const validSources = sources.filter((source) => !!source.fingerprint);

        const response = await window.electron.hydraApi.post(
          "/catalogue/search",
          {
            data: {
              genres: [],
              tags: [],
              downloadSourceFingerprints: [],
              developers: [],
              publishers: [],
              protondbSupportBadges: [],
              deckCompatibility: [],
              take: 60,
              skip: 0,
              downloadSourceIds: validSources.map((s) => s.id),
            },
            needsAuth: false,
          }
        );

        (window as any).__HYDRA_CATALOGUE_CACHE__ = {
          results: (response as any).edges,
          count: (response as any).count,
          page: 1,
          key: JSON.stringify({
            filtersArg: {
              genres: [],
              tags: [],
              downloadSourceFingerprints: [],
              developers: [],
              publishers: [],
              protondbSupportBadges: [],
              deckCompatibility: [],
            },
            sources: validSources,
            take: 60,
            offset: 0,
          }),
        };
      } catch (err) {}

      try {
        if (!initialUserId || (window as any).__HYDRA_PROFILE_CACHE__) return;
        const [stats, profile, libraryRes] = await Promise.all([
          window.electron.hydraApi
            .get(`/users/${initialUserId}/stats`)
            .catch(() => null),
          window.electron.hydraApi
            .get(`/users/${initialUserId}`)
            .catch(() => null),
          window.electron.hydraApi
            .get(`/users/${initialUserId}/library?take=100&skip=0`)
            .catch(() => null),
        ]);

        let bgColor: string | undefined;
        if ((profile as any)?.profileImageUrl) {
          const { average } = await import("color.js");
          const bg = await average((profile as any).profileImageUrl, {
            amount: 1,
            format: "hex",
          });
          bgColor = `linear-gradient(135deg, ${bg}, ${(profile as any).profileImageUrl})`; // Simple fallback coloring to not depend on darkenColor
        }

        (window as any).__HYDRA_PROFILE_CACHE__ = {
          stats: stats || null,
          profile: profile || null,
          library: (libraryRes as any)?.library || [],
          pinned: (libraryRes as any)?.pinnedGames || [],
          bg: bgColor,
        };
      } catch (err) {}
    }, 500);
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
          {!isSidebarHovered && !isSidebarForceOpen && !isGamepadConnected && (
            <div className="title-bar__options">
              <button
                type="button"
                className="title-bar__option"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("hydra:close-notifications")
                  );
                  setIsSidebarForceOpen(true);
                }}
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
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("hydra:test-splash"))
                }
              >
                Test Intro
              </button>
              <button
                type="button"
                className="title-bar__option"
                onClick={() =>
                  window.electron.showAchievementTestNotification?.()
                }
              >
                Test Notif
              </button>
              <button
                type="button"
                className="title-bar__option"
                onClick={() => {
                  setLastPacket({
                    gameId: library[0]?.id || "test-game-id",
                    progress: Math.random() * 0.9 + 0.1,
                    downloadSpeed: 5 * 1024 * 1024,
                    timeRemaining: 120000,
                    numPeers: 12,
                    numSeeds: 30,
                    isDownloadingMetadata: false,
                    isCheckingFiles: false,
                    folderName: "Cyberpunk 2077 Simulator",
                    status: "downloading",
                    fileSize: 1000000000,
                    bytesDownloaded: 150000000,
                  } as any);
                }}
              >
                Test DL
              </button>
              <button
                type="button"
                className="title-bar__option"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("hydra:test-friend"))
                }
              >
                Test Amigo
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

      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      <BackgroundEffectRenderer />

      <main className={cn({ "app-is-loading": showSplash })}>
        <div
          className={cn("sidebar-wrapper", {
            "sidebar-wrapper--force-open": isSidebarForceOpen,
          })}
          onMouseEnter={handleSidebarEnter}
          onMouseLeave={handleSidebarLeave}
          data-gamepad-ignore={!isSidebarForceOpen ? "true" : undefined}
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
      <GamepadGuide />
    </>
  );
}
