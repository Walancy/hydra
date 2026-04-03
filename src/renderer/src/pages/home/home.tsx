import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useDominantColor,
  useAppDispatch,
  useAppSelector,
} from "@renderer/hooks";
import { setCatalogueCategory } from "@renderer/features";
import { useTranslation } from "react-i18next";
import { levelDBService } from "@renderer/services/leveldb.service";
import { orderBy } from "lodash-es";
import { useNavigate } from "react-router-dom";

import Skeleton, { SkeletonTheme } from "react-loading-skeleton";

import { Button } from "@renderer/components";
import type { DownloadSource, LibraryGame, ShopAssets } from "@types";
import { useLibrary } from "@renderer/hooks/use-library";

import { buildGameDetailsPath, playBeep } from "@renderer/helpers";
import { CatalogueCategory } from "@shared";
import cn from "classnames";
import { GameInfo } from "./game-info";
import { FolderInfo } from "./folder-info";
import { HeroCarousel } from "./hero-carousel";
import {
  ContextMenu,
  type ContextMenuItemData,
  ConfirmationModal,
  DownloadGameModal,
} from "@renderer/components";
import { useHomeGroups, type HomeGroup } from "@renderer/hooks/use-home-groups";
import { PlusCircleIcon, StackIcon, TrashIcon } from "@primer/octicons-react";
import { CreateFolderModal } from "./create-folder-modal";
import { setOpenedFolderName } from "@renderer/features";
import { useGamepadConnected } from "@renderer/hooks/use-gamepad";
import { useHomeGamepad } from "@renderer/hooks/use-home-gamepad";
import { GamepadHint } from "@renderer/components/gamepad-hint/gamepad-hint";
import "./home.scss";

export default function Home() {
  const { t } = useTranslation("home");
  const navigate = useNavigate();
  const { library } = useLibrary();

  const [isLoading, setIsLoading] = useState(false);
  const [downloadGame, setDownloadGame] = useState<ShopAssets | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMyGames, setIsMyGames] = useState(true);
  const sliderRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  const [isSliderActive, setIsSliderActive] = useState(true);

  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    scrollLeft: 0,
    hasDragged: false,
  });
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);

  const prevIndexRef = useRef(selectedIndex);

  useEffect(() => {
    if (prevIndexRef.current !== selectedIndex) {
      if (!isLoading) playBeep();
      prevIndexRef.current = selectedIndex;
    }
  }, [selectedIndex, isLoading]);

  const dispatch = useAppDispatch();
  const { closeFolderTrigger } = useAppSelector((state) => state.window);

  const {
    groups,
    createGroup,
    removeGameFromGroup,
    deleteGroup,
    renameGroup,
    updateGroup,
  } = useHomeGroups();
  const [openedGroup, setOpenedGroup] = useState<HomeGroup | null>(null);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<HomeGroup | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    position: { x: number; y: number };
    targetItem?: {
      type: "game" | "folder";
      id: string;
      groupId?: string;
    } | null;
  } | null>(null);

  const [currentCatalogueCategory, setCurrentCatalogueCategory] = useState(
    CatalogueCategory.Hot
  );

  const catalogue = useAppSelector((state) => state.homeCatalogue.catalogue);

  const getCatalogue = useCallback(
    async (category: CatalogueCategory, forceLoadingState = true) => {
      const hasCached = catalogue[category] && catalogue[category].length > 0;

      try {
        setCurrentCatalogueCategory(category);
        // Only show skeleton if we have no cached data yet
        if (forceLoadingState && !hasCached) setIsLoading(true);

        const sources = (await levelDBService.values(
          "downloadSources"
        )) as DownloadSource[];
        const downloadSources = orderBy(sources, "createdAt", "desc");

        const params = {
          take: 20,
          skip: 0,
          downloadSourceIds: downloadSources.map((source) => source.id),
        };

        const result = await window.electron.hydraApi.get<ShopAssets[]>(
          `/catalogue/${category}`,
          { params, needsAuth: false }
        );

        dispatch(setCatalogueCategory({ category, games: result }));
        if (!hasCached) setSelectedIndex(0);
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch, catalogue]
  );

  const handleCategoryClick = (category: CatalogueCategory) => {
    if (category !== currentCatalogueCategory) {
      getCatalogue(category);
    }
  };

  const handleMyGamesClick = () => {
    setIsTransitioning(true);
    setIsMyGames(true);
    setOpenedGroup(null);
    setSelectedIndex(0);
    requestAnimationFrame(() => setIsTransitioning(false));
  };

  const handleCatTabClick = (category: CatalogueCategory) => {
    setIsMyGames(false);
    setOpenedGroup(null);
    handleCategoryClick(category);
  };

  useEffect(() => {
    dispatch(setOpenedFolderName(openedGroup?.name ?? null));
  }, [openedGroup, dispatch]);

  useEffect(() => {
    if (closeFolderTrigger > 0) {
      setOpenedGroup(null);
      setSelectedIndex(0);
    }
  }, [closeFolderTrigger]);

  useEffect(() => {
    if (
      !catalogue[CatalogueCategory.Hot] ||
      catalogue[CatalogueCategory.Hot].length === 0
    ) {
      getCatalogue(CatalogueCategory.Hot, false).then(() => {
        // Prefetch other categories silently after Hot loads
        const others = Object.values(CatalogueCategory).filter(
          (c) => c !== CatalogueCategory.Hot
        );
        others.forEach((c) => {
          if (!catalogue[c] || catalogue[c].length === 0) {
            getCatalogue(c, false).catch(() => {});
          }
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = Object.values(CatalogueCategory);

  const libraryAsGames = useMemo<
    (ShopAssets & {
      executablePath?: string | null;
      lastTimePlayed?: string | null;
    })[]
  >(
    () =>
      library
        .filter(
          (
            g
          ): g is LibraryGame & {
            objectId: string;
            shop: NonNullable<LibraryGame["shop"]>;
          } => Boolean(g.objectId && g.shop)
        )
        .map((g) => ({
          objectId: g.objectId!,
          shop: g.shop!,
          title: g.title,
          iconUrl: g.iconUrl ?? null,
          libraryHeroImageUrl: g.libraryHeroImageUrl ?? null,
          libraryImageUrl: g.libraryImageUrl ?? null,
          logoImageUrl: g.logoImageUrl ?? null,
          logoPosition: null,
          coverImageUrl: null,
          downloadSources: [],
          executablePath: g.executablePath,
          lastTimePlayed: g.lastTimePlayed ?? null,
        })),
    [library]
  );

  const homeItems = useMemo(() => {
    if (!isMyGames) {
      return catalogue[currentCatalogueCategory].map((g) => ({
        type: "game" as const,
        data: g,
        covers: [],
      }));
    }

    if (openedGroup) {
      const activeGroup = groups.find((g) => g.id === openedGroup.id);
      if (!activeGroup) return [];

      return libraryAsGames
        .filter((g) => activeGroup.gameIds.includes(g.objectId))
        .map((g) => ({ type: "game" as const, data: g, covers: [] }));
    }

    const FOLDERS = groups.map((g) => {
      const covers = g.gameIds
        .map(
          (id) =>
            libraryAsGames.find((lg) => lg.objectId === id)?.libraryImageUrl
        )
        .filter(Boolean) as string[];
      // We will fill missing covers with null to render opaque boxes later if needed
      return { type: "folder" as const, data: g, covers: covers.slice(0, 4) };
    });

    const installedGames = libraryAsGames.filter((g) => g.executablePath);
    const sourceGames =
      installedGames.length > 0 ? installedGames : libraryAsGames;

    const unassignedGames = sourceGames
      .filter(
        (g) => !groups.some((group) => group.gameIds.includes(g.objectId))
      )
      .map((g) => ({ type: "game" as const, data: g, covers: [] }));

    const trendingGames = [...unassignedGames]
      .filter((g) => g.data.lastTimePlayed != null)
      .sort(
        (a, b) =>
          new Date(b.data.lastTimePlayed!).getTime() -
          new Date(a.data.lastTimePlayed!).getTime()
      )
      .slice(0, 6);

    const trendingIds = new Set(trendingGames.map((g) => g.data.objectId));

    const remainingGames = unassignedGames
      .filter((g) => !trendingIds.has(g.data.objectId))
      .sort((a, b) => (a.data.title || "").localeCompare(b.data.title || ""));

    const sortedFolders = [...FOLDERS].sort((a, b) =>
      (a.data.name || "").localeCompare(b.data.name || "")
    );

    const combined: {
      type: "game" | "folder" | "button_library" | "button_create_folder";
      data: any;
      covers: string[];
    }[] = [...trendingGames, ...sortedFolders, ...remainingGames];

    combined.push({ type: "button_library", data: null as any, covers: [] });
    combined.push({
      type: "button_create_folder",
      data: null as any,
      covers: [],
    });

    return combined;
  }, [
    isMyGames,
    libraryAsGames,
    groups,
    openedGroup,
    catalogue,
    currentCatalogueCategory,
  ]);

  const showSkeleton = isLoading || isTransitioning;
  const currentGames = homeItems;
  const selectedItem = showSkeleton
    ? null
    : (currentGames[selectedIndex] ?? null);
  const selectedGame =
    selectedItem?.type === "game" ? (selectedItem.data as ShopAssets) : null;
  const selectedFolder =
    selectedItem?.type === "folder" ? (selectedItem.data as HomeGroup) : null;

  const backgroundSrc = useMemo(() => {
    if (!selectedGame) return undefined;
    if (selectedGame.libraryHeroImageUrl) {
      return selectedGame.libraryHeroImageUrl;
    }
    if (selectedGame.shop === "steam") {
      return `https://steamcdn-a.akamaihd.net/steam/apps/${selectedGame.objectId}/library_hero.jpg`;
    }
    return selectedGame.libraryImageUrl ?? undefined;
  }, [selectedGame]);

  const cardImageUrl = useMemo(() => {
    if (!selectedGame) return undefined;
    return selectedGame.shop === "steam"
      ? `https://steamcdn-a.akamaihd.net/steam/apps/${selectedGame.objectId}/library_600x900_2x.jpg`
      : (selectedGame.libraryImageUrl ?? undefined);
  }, [selectedGame]);

  const { color: glowColor } = useDominantColor(cardImageUrl);
  const { isLight: isBgLight } = useDominantColor(backgroundSrc);

  const scrollToCard = useCallback((index: number) => {
    const slider = sliderRef.current;
    if (!slider) return;
    const card = slider.children[index] as HTMLElement | undefined;
    if (!card) return;
    const padding = slider.clientWidth * 0.03;
    const cardLeft = card.offsetLeft;
    const cardRight = card.offsetLeft + card.offsetWidth;
    const visibleLeft = slider.scrollLeft;
    const visibleRight = slider.scrollLeft + slider.clientWidth;

    if (cardLeft < visibleLeft + padding) {
      slider.scrollTo({ left: cardLeft - padding, behavior: "smooth" });
    } else if (cardRight > visibleRight - padding) {
      slider.scrollTo({
        left: cardRight - slider.clientWidth + padding,
        behavior: "smooth",
      });
    }
  }, []);

  const isGamepadConnected = useGamepadConnected();
  const allTabKeys = ["myGames", ...categories] as const;
  const activeTabIndex = isMyGames
    ? 0
    : 1 + categories.indexOf(currentCatalogueCategory);

  const handleTabChange = useCallback(
    (idx: number) => {
      if (idx === 0) handleMyGamesClick();
      else handleCatTabClick(categories[idx - 1]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories, currentCatalogueCategory, isMyGames]
  );

  const handleGamepadConfirm = useCallback(() => {
    const item = homeItems[selectedIndex];
    if (!item) return;
    if (item.type === "folder") {
      setOpenedGroup(item.data as HomeGroup);
      setSelectedIndex(0);
    } else if (item.type === "button_library") {
      navigate("/library");
    } else if (item.type === "button_create_folder") {
      setShowCreateFolderModal(true);
    } else if (item.type === "game") {
      navigate(buildGameDetailsPath(item.data as ShopAssets));
    }
  }, [homeItems, selectedIndex, navigate]);

  const handleGamepadBack = useCallback(() => {
    if (openedGroup) {
      setOpenedGroup(null);
      setSelectedIndex(0);
    }
  }, [openedGroup]);

  useHomeGamepad({
    isLoading,
    isEnabled: isGamepadConnected,
    items: homeItems as Parameters<typeof useHomeGamepad>[0]["items"],
    selectedIndex,
    openedGroup,
    allTabs: allTabKeys as unknown as string[],
    activeTabIndex,
    setSelectedIndex,
    scrollToCard,
    onTabChange: handleTabChange,
    onConfirm: handleGamepadConfirm,
    onBack: handleGamepadBack,
    sliderRef,
    actionsRef,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLoading || currentGames.length === 0) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = Math.min(prev + 1, currentGames.length - 1);
          scrollToCard(next);
          return next;
        });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = Math.max(prev - 1, 0);
          scrollToCard(next);
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoading, currentGames.length, scrollToCard]);

  useEffect(() => {
    if (!isLoading && currentGames.length > 0) {
      requestAnimationFrame(() => scrollToCard(0));
    }
  }, [isLoading, currentGames.length, scrollToCard]);

  const handleContextMenu = (
    e: React.MouseEvent,
    targetItem?: { type: "game" | "folder"; id: string; groupId?: string }
  ) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      position: { x: e.clientX, y: e.clientY },
      targetItem,
    });
  };

  const getContextMenuItems = (): ContextMenuItemData[] => {
    const items: ContextMenuItemData[] = [];

    if (isMyGames && !openedGroup) {
      items.push({
        id: "create-group",
        label: t("criar_grupo", { defaultValue: "Criar Grupo" }),
        onClick: () => {
          const name = window.prompt(
            t("nome_do_grupo", { defaultValue: "Nome do grupo:" })
          );
          if (name?.trim()) createGroup(name);
        },
      });
    }

    if (isMyGames && contextMenu?.targetItem?.type === "folder") {
      const targetId = contextMenu.targetItem.id;
      items.push({
        id: "delete-group",
        label: t("excluir_grupo", { defaultValue: "Excluir Grupo" }),
        danger: true,
        onClick: () => {
          setFolderToDelete(targetId);
        },
      });
    }

    if (isMyGames && openedGroup && contextMenu?.targetItem?.type === "game") {
      const targetId = contextMenu.targetItem.id;
      items.push({
        id: "remove-from-group",
        label: t("remover_do_grupo", { defaultValue: "Remover do Grupo" }),
        danger: true,
        onClick: () => removeGameFromGroup(openedGroup.id, targetId),
      });
    }

    return items;
  };

  return (
    <SkeletonTheme baseColor="#1c1c1c" highlightColor="#444">
      <section className="home">
        {selectedGame && <div className="home__solid-background" />}
        {backgroundSrc && (
          <img
            src={backgroundSrc}
            alt=""
            className="home__background"
            key={backgroundSrc}
          />
        )}
        <div className="home__overlay" />

        <div className="home__content">
          {!openedGroup && (
            <ul className="home__tabs" data-gamepad-ignore="true">
              {isGamepadConnected && (
                <li className="home__tabs-hint">
                  <GamepadHint label="LT" position="left" />
                </li>
              )}
              <li>
                <Button
                  theme={
                    isMyGames ? (isBgLight ? "dark" : "primary") : "outline"
                  }
                  onClick={handleMyGamesClick}
                >
                  {t("my_games")}
                </Button>
              </li>
              {categories.map((category) => (
                <li key={category}>
                  <Button
                    theme={
                      !isMyGames && category === currentCatalogueCategory
                        ? isBgLight
                          ? "dark"
                          : "primary"
                        : "outline"
                    }
                    onClick={() => handleCatTabClick(category)}
                  >
                    {t(category)}
                  </Button>
                </li>
              ))}
              {isGamepadConnected && (
                <li className="home__tabs-hint">
                  <GamepadHint label="RT" position="right" />
                </li>
              )}
            </ul>
          )}

          {openedGroup && (
            <div className="home__folder-header">
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <Button
                  theme={isBgLight ? "dark" : "primary"}
                  title={t("add_game", { defaultValue: "Adicionar Jogo" })}
                  className="home__folder-header-action-btn"
                  onClick={() => {
                    setSelectedIndex(currentGames.length);
                    setFolderToEdit(openedGroup);
                  }}
                >
                  <PlusCircleIcon size={16} />
                </Button>
                <Button
                  theme={isBgLight ? "dark" : "primary"}
                  title={t("excluir_pasta", { defaultValue: "Excluir pasta" })}
                  className="home__folder-header-action-btn"
                  onClick={() => {
                    setFolderToDelete(openedGroup.id);
                  }}
                >
                  <TrashIcon size={16} />
                </Button>
              </div>
              <input
                className="home__folder-header-title-input"
                value={openedGroup.name}
                onChange={(e) => {
                  const newName = e.target.value;
                  setOpenedGroup({ ...openedGroup, name: newName });
                  renameGroup(openedGroup.id, newName);
                }}
              />
            </div>
          )}

          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div
            className="home__slider"
            ref={sliderRef}
            onFocus={() => setIsSliderActive(true)}
            onContextMenu={(e) => handleContextMenu(e)}
            onMouseDown={(e) => {
              dragRef.current.isDragging = true;
              dragRef.current.startX = e.pageX - e.currentTarget.offsetLeft;
              dragRef.current.scrollLeft = e.currentTarget.scrollLeft;
              dragRef.current.hasDragged = false;
            }}
            onMouseLeave={() => {
              dragRef.current.isDragging = false;
            }}
            onMouseUp={() => {
              dragRef.current.isDragging = false;
            }}
            onMouseMove={(e) => {
              if (!dragRef.current.isDragging) return;
              e.preventDefault();
              const x = e.pageX - e.currentTarget.offsetLeft;
              const walk = (x - dragRef.current.startX) * 2;
              if (Math.abs(walk) > 5) dragRef.current.hasDragged = true;
              e.currentTarget.scrollLeft = dragRef.current.scrollLeft - walk;
            }}
          >
            {showSkeleton
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="home__card">
                    <Skeleton className="home__card-skeleton" />
                  </div>
                ))
              : currentGames.map((item, index) => {
                  if (item.type === "button_library") {
                    return (
                      <button
                        key="btn-lib"
                        type="button"
                        className={cn("home__card home__action-btn", {
                          "home__card--selected": index === selectedIndex,
                        })}
                        onFocus={() => {
                          setSelectedIndex(index);
                          scrollToCard(index);
                        }}
                        onClick={() => {
                          if (dragRef.current.hasDragged) return;
                          setSelectedIndex(index);
                          navigate("/library");
                        }}
                      >
                        <StackIcon size={32} />
                        <span>
                          {t("acessar_biblioteca", {
                            defaultValue: "Acessar Biblioteca",
                          })}
                        </span>
                      </button>
                    );
                  }
                  if (item.type === "button_create_folder") {
                    return (
                      <button
                        key="btn-folder"
                        type="button"
                        className={cn("home__card home__action-btn", {
                          "home__card--selected": index === selectedIndex,
                        })}
                        onFocus={() => {
                          setSelectedIndex(index);
                          scrollToCard(index);
                        }}
                        onClick={() => {
                          if (dragRef.current.hasDragged) return;
                          setSelectedIndex(index);
                          setShowCreateFolderModal(true);
                        }}
                      >
                        <PlusCircleIcon size={32} />
                        <span>
                          {t("criar_pasta", { defaultValue: "Criar Pasta" })}
                        </span>
                      </button>
                    );
                  }

                  const isFolder = item.type === "folder";
                  const game = !isFolder ? (item.data as ShopAssets) : null;
                  const folder = isFolder ? (item.data as HomeGroup) : null;
                  const itemId = isFolder ? folder!.id : game!.objectId;

                  return (
                    <button
                      key={itemId}
                      type="button"
                      onContextMenu={(e) => {
                        e.stopPropagation();
                        handleContextMenu(e, {
                          type: isFolder ? "folder" : "game",
                          id: itemId,
                        });
                      }}
                      className={cn("home__card", {
                        "home__card--selected": index === selectedIndex,
                        "home__card--gamepad-focus":
                          isGamepadConnected &&
                          index === selectedIndex &&
                          isSliderActive,
                        "home__folder-card": isFolder,
                      })}
                      onFocus={() => {
                        setSelectedIndex(index);
                        scrollToCard(index);
                      }}
                      onClick={() => {
                        if (dragRef.current.hasDragged) return;
                        setSelectedIndex(index);
                      }}
                      onDoubleClick={() => {
                        if (isFolder) {
                          setOpenedGroup(folder);
                          setSelectedIndex(0);
                        } else {
                          navigate(buildGameDetailsPath(game!));
                        }
                      }}
                      style={
                        index === selectedIndex && !isFolder
                          ? { boxShadow: `inset 0 0 0 2px ${glowColor}` }
                          : undefined
                      }
                    >
                      {isFolder ? (
                        <div className="home__folder-grid">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="home__folder-thumb-wrapper">
                              {item.covers[i] ? (
                                <img
                                  src={item.covers[i]}
                                  alt=""
                                  className="home__folder-thumb"
                                  draggable={false}
                                />
                              ) : (
                                <div className="home__folder-thumb-empty" />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <img
                          src={
                            game!.shop === "steam"
                              ? `https://steamcdn-a.akamaihd.net/steam/apps/${game!.objectId}/library_600x900_2x.jpg`
                              : (game!.libraryImageUrl ?? undefined)
                          }
                          alt={game!.title}
                          className="home__card-image"
                          loading="lazy"
                          draggable={false}
                          onError={(e) => {
                            const img = e.currentTarget;
                            if (
                              game!.libraryImageUrl &&
                              img.src !== game!.libraryImageUrl
                            ) {
                              img.src = game!.libraryImageUrl;
                            }
                          }}
                        />
                      )}
                    </button>
                  );
                })}
          </div>

          <div
            className="home__bottom-segment"
            ref={actionsRef}
            onFocus={() => setIsSliderActive(false)}
          >
            {selectedGame && (
              <GameInfo
                game={selectedGame}
                isBgLight={isBgLight}
                onInstallClick={(g) => setDownloadGame(g)}
                onAddToLibrary={
                  !isMyGames
                    ? (g) => {
                        window.electron
                          .addGameToLibrary(g.shop, g.objectId, g.title)
                          .then(() => {});
                      }
                    : undefined
                }
                isInLibrary={
                  !isMyGames &&
                  libraryAsGames.some(
                    (g) => g.objectId === selectedGame.objectId
                  )
                }
                onLocateExecutable={async (g) => {
                  const downloadsPath =
                    await window.electron.getDefaultDownloadsPath();
                  const { filePaths } = await window.electron.showOpenDialog({
                    properties: ["openFile"],
                    defaultPath: downloadsPath,
                    filters: [
                      { name: "Game executable", extensions: ["exe", "lnk"] },
                    ],
                  });
                  if (filePaths?.[0]) {
                    await window.electron.updateExecutablePath(
                      g.shop,
                      g.objectId,
                      filePaths[0]
                    );
                  }
                }}
              />
            )}
            {selectedFolder && (
              <FolderInfo
                folder={selectedFolder}
                libraryAsGames={libraryAsGames}
                onOpenFolder={() => {
                  setOpenedGroup(selectedFolder);
                  setSelectedIndex(0);
                }}
                isBgLight={isBgLight}
              />
            )}

            {!selectedGame && !selectedFolder && <div />}

            {catalogue[CatalogueCategory.Hot]?.length > 0 && (
              <HeroCarousel games={catalogue[CatalogueCategory.Hot]} />
            )}
          </div>
        </div>

        {contextMenu && (
          <ContextMenu
            items={getContextMenuItems()}
            visible={contextMenu.visible && getContextMenuItems().length > 0}
            position={contextMenu.position}
            onClose={() => setContextMenu(null)}
          />
        )}
      </section>

      {(showCreateFolderModal || folderToEdit) && (
        <CreateFolderModal
          visible={showCreateFolderModal || !!folderToEdit}
          onClose={() => {
            setShowCreateFolderModal(false);
            setFolderToEdit(null);
          }}
          initialName={folderToEdit ? folderToEdit.name : ""}
          initialSelectedIds={folderToEdit ? folderToEdit.gameIds : []}
          onCreate={(name, gameIds) => {
            if (folderToEdit) {
              updateGroup(folderToEdit.id, name, gameIds);
              setOpenedGroup((prev) =>
                prev ? { ...prev, name, gameIds } : null
              );
            } else {
              createGroup(name, gameIds);
            }
            setShowCreateFolderModal(false);
            setFolderToEdit(null);
          }}
          games={libraryAsGames}
        />
      )}

      {folderToDelete && (
        <ConfirmationModal
          visible={!!folderToDelete}
          title={t("excluir_pasta", { defaultValue: "Excluir pasta" })}
          descriptionText={t("confirmar_exclusao_pasta", {
            defaultValue: "Tem certeza de que deseja excluir esta pasta?",
          })}
          confirmButtonLabel={t("excluir", { defaultValue: "Excluir" })}
          cancelButtonLabel={t("cancelar", { defaultValue: "Cancelar" })}
          onConfirm={() => {
            deleteGroup(folderToDelete);
            if (openedGroup?.id === folderToDelete) {
              setOpenedGroup(null);
            }
            setFolderToDelete(null);
          }}
          onClose={() => setFolderToDelete(null)}
        />
      )}

      {downloadGame && (
        <DownloadGameModal
          visible={!!downloadGame}
          game={downloadGame as any}
          onClose={() => setDownloadGame(null)}
        />
      )}
    </SkeletonTheme>
  );
}
