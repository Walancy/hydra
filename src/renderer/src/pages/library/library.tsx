import { useEffect, useMemo, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  useLibrary,
  useAppDispatch,
  useAppSelector,
  useGameCollections,
  useToast,
} from "@renderer/hooks";
import { setHeaderTitle, setLibrarySearchQuery } from "@renderer/features";
import {
  HeartIcon,
  TelescopeIcon,
  FileDirectoryIcon,
  PencilIcon,
  TrashIcon,
  SearchIcon,
  UploadIcon,
  ChevronLeftIcon,
  PlusIcon,
} from "@primer/octicons-react";
import { useTranslation } from "react-i18next";
import { GameCollection, LibraryGame } from "@types";
import {
  Button,
  ConfirmationModal,
  ContextMenu,
  GameContextMenu,
  Modal,
  TextField,
} from "@renderer/components";
import { useSearchParams } from "react-router-dom";
import { useDownload } from "@renderer/hooks";
import { LibraryGameCard } from "./library-game-card";
import { ViewOptions, ViewMode } from "./view-options";
import { FilterOptions, SortOption } from "./filter-options";
import { LibraryCatalogueView } from "./library-catalogue-view";
import "./library.scss";
import {
  matchesAcronym,
  expandAcronym,
} from "@renderer/services/game-acronyms";
import { useHomeGroups } from "@renderer/hooks/use-home-groups";
import { CreateFolderModal } from "../home/create-folder-modal";
import { AddCustomGameModal } from "./add-custom-game-modal";

const FAVORITES_COLLECTION_ID = "__favorites__";
const SORT_OPTIONS: SortOption[] = [
  "title_asc",
  "recently_played",
  "most_played",
  "installed_first",
  "title_desc",
];

const getGameCollectionIds = (game: LibraryGame): string[] => {
  if (Array.isArray(game.collectionIds)) {
    return game.collectionIds;
  }

  const legacyCollectionId = (game as { collectionId?: string | null })
    .collectionId;

  return legacyCollectionId ? [legacyCollectionId] : [];
};

export default function Library() {
  const { library, updateLibrary } = useLibrary();
  const {
    groups: homeGroups,
    createGroup,
    updateGroup,
    deleteGroup,
  } = useHomeGroups();
  const { showSuccessToast, showErrorToast } = useToast();
  const { removeGameFromLibrary, cancelDownload, lastPacket } = useDownload();
  const {
    collections,
    loadCollections,
    hasLoaded: hasLoadedCollections,
  } = useGameCollections();
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const savedViewMode = localStorage.getItem("library-view-mode");
    return (savedViewMode as ViewMode) || "compact";
  });
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const savedSortBy = localStorage.getItem("library-sort-by");
    if (savedSortBy && SORT_OPTIONS.includes(savedSortBy as SortOption)) {
      return savedSortBy as SortOption;
    }

    return "title_asc";
  });
  const [gameContextMenu, setGameContextMenu] = useState<{
    game: LibraryGame | null;
    visible: boolean;
    position: { x: number; y: number };
  }>({ game: null, visible: false, position: { x: 0, y: 0 } });
  const [collectionContextMenu, setCollectionContextMenu] = useState<{
    collection: GameCollection | null;
    visible: boolean;
    position: { x: number; y: number };
  }>({ collection: null, visible: false, position: { x: 0, y: 0 } });
  const [activeCollection, setActiveCollection] =
    useState<GameCollection | null>(null);
  const [showRenameCollectionModal, setShowRenameCollectionModal] =
    useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [isRenamingCollection, setIsRenamingCollection] = useState(false);
  const [showDeleteCollectionModal, setShowDeleteCollectionModal] =
    useState(false);
  const [isDeletingCollection, setIsDeletingCollection] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderToEdit, setFolderToEdit] = useState<
    (typeof homeGroups)[0] | null
  >(null);
  const [gameToRemove, setGameToRemove] = useState<LibraryGame | null>(null);
  const [isRemovingGame, setIsRemovingGame] = useState(false);
  const [showAddCustomGameModal, setShowAddCustomGameModal] = useState(false);

  const searchQuery = useAppSelector((state) => state.library.searchQuery);
  const dispatch = useAppDispatch();
  const { t } = useTranslation(["library", "sidebar"]);

  const selectedCollectionId = searchParams.get("collection");

  const handleCollectionSelect = useCallback(
    (collectionId: string | null) => {
      const params = new URLSearchParams(searchParams);

      if (collectionId) {
        params.set("collection", collectionId);
      } else {
        params.delete("collection");
      }

      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("library-view-mode", mode);
  }, []);

  const handleSortChange = useCallback((nextSortBy: SortOption) => {
    setSortBy(nextSortBy);
    localStorage.setItem("library-sort-by", nextSortBy);
  }, []);

  const handleImportFromFolder = useCallback(async () => {
    const { filePaths } = await window.electron.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (!filePaths || filePaths.length === 0) return;

    const { importedGames } = await window.electron.importGamesFromFolder(
      filePaths[0]
    );
    if (importedGames.length > 0) {
      showSuccessToast(
        t("import_folder_success", {
          defaultValue: "{{count}} jogo(s) importado(s) com sucesso!",
          count: importedGames.length,
        })
      );
    } else {
      showErrorToast(
        t("import_folder_empty", {
          defaultValue: "Nenhum jogo encontrado na pasta selecionada.",
        })
      );
    }
  }, [showSuccessToast, showErrorToast, t]);

  useEffect(() => {
    dispatch(setHeaderTitle(t("library")));

    const unsubscribe = window.electron.onLibraryBatchComplete(() => {
      updateLibrary();
      void loadCollections();
    });

    window.electron.refreshLibraryAssets().finally(() => {
      const collectionsPromise = hasLoadedCollections
        ? Promise.resolve([])
        : loadCollections();

      void Promise.all([updateLibrary(), collectionsPromise]);
    });

    return () => {
      unsubscribe();
    };
  }, [dispatch, t, updateLibrary, loadCollections, hasLoadedCollections]);

  const handleOnMouseEnterGameCard = useCallback(() => {
    // Optional: pause animations if needed
  }, []);

  const handleOnMouseLeaveGameCard = useCallback(() => {
    // Optional: resume animations if needed
  }, []);

  const handleOpenContextMenu = useCallback(
    (game: LibraryGame, position: { x: number; y: number }) => {
      setGameContextMenu({ game, visible: true, position });
    },
    []
  );

  const handleCloseContextMenu = useCallback(() => {
    setGameContextMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleToggleFavorite = useCallback(
    async (game: LibraryGame) => {
      if (game.favorite) {
        await window.electron.removeGameFromFavorites(game.shop, game.objectId);
      } else {
        await window.electron.addGameToFavorites(game.shop, game.objectId);
      }
      updateLibrary();
    },
    [updateLibrary]
  );

  const handleRemoveFromLibrary = useCallback(
    async (game: LibraryGame) => {
      setIsRemovingGame(true);
      try {
        const isDownloading =
          game.download?.status === "active" && lastPacket?.gameId === game.id;
        if (isDownloading) {
          await cancelDownload(game.shop, game.objectId);
        }
        await removeGameFromLibrary(game.shop, game.objectId);
        await updateLibrary();
        showSuccessToast(
          t("game_removed_from_library", {
            ns: "game_details",
            defaultValue: "Jogo removido da biblioteca",
          })
        );
      } catch {
        showErrorToast(
          t("failed_remove_from_library", {
            ns: "game_details",
            defaultValue: "Erro ao remover da biblioteca",
          })
        );
      } finally {
        setIsRemovingGame(false);
        setGameToRemove(null);
      }
    },
    [
      cancelDownload,
      lastPacket,
      removeGameFromLibrary,
      showErrorToast,
      showSuccessToast,
      t,
      updateLibrary,
    ]
  );

  const handleOpenCollectionContextMenu = useCallback(
    (
      event: React.MouseEvent<HTMLButtonElement>,
      collection: GameCollection
    ) => {
      event.preventDefault();

      setCollectionContextMenu({
        collection,
        visible: true,
        position: { x: event.clientX, y: event.clientY },
      });
    },
    []
  );

  const handleCloseCollectionContextMenu = useCallback(() => {
    setCollectionContextMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  const resolveCollectionErrorMessage = useCallback(
    (
      error: unknown,
      fallbackKey: "failed_rename_collection" | "failed_delete_collection"
    ) => {
      if (!(error instanceof Error)) return t(fallbackKey);

      if (error.message.includes("game/collection-name-already-in-use")) {
        return t("collection_name_already_in_use", { ns: "sidebar" });
      }

      if (error.message.includes("game/collection-name-required")) {
        return t("collection_name_required", { ns: "sidebar" });
      }

      return t(fallbackKey);
    },
    [t]
  );

  const handleOpenRenameCollectionModal = useCallback(() => {
    const collection = collectionContextMenu.collection;
    if (!collection) return;

    setActiveCollection(collection);
    setCollectionName(collection.name);
    setShowRenameCollectionModal(true);
    handleCloseCollectionContextMenu();
  }, [collectionContextMenu.collection, handleCloseCollectionContextMenu]);

  const handleCloseRenameCollectionModal = useCallback(() => {
    if (isRenamingCollection) return;

    setShowRenameCollectionModal(false);
    setCollectionName("");
    setActiveCollection(null);
  }, [isRenamingCollection]);

  const handleRenameCollection = useCallback(async () => {
    if (!activeCollection) return;

    const nextName = collectionName.trim();
    if (!nextName) {
      showErrorToast(t("collection_name_required", { ns: "sidebar" }));
      return;
    }

    if (nextName === activeCollection.name.trim()) {
      handleCloseRenameCollectionModal();
      return;
    }

    setIsRenamingCollection(true);

    try {
      await window.electron.hydraApi.put(
        `/profile/games/collections/${activeCollection.id}`,
        {
          data: { name: nextName },
          needsAuth: true,
        }
      );

      await loadCollections();
      showSuccessToast(t("collection_renamed"));
      handleCloseRenameCollectionModal();
    } catch (error) {
      showErrorToast(
        resolveCollectionErrorMessage(error, "failed_rename_collection")
      );
    } finally {
      setIsRenamingCollection(false);
    }
  }, [
    activeCollection,
    collectionName,
    handleCloseRenameCollectionModal,
    loadCollections,
    resolveCollectionErrorMessage,
    showErrorToast,
    showSuccessToast,
    t,
  ]);

  const handleOpenDeleteCollectionModal = useCallback(() => {
    const collection = collectionContextMenu.collection;
    if (!collection) return;

    setActiveCollection(collection);
    setShowDeleteCollectionModal(true);
    handleCloseCollectionContextMenu();
  }, [collectionContextMenu.collection, handleCloseCollectionContextMenu]);

  const handleCloseDeleteCollectionModal = useCallback(() => {
    if (isDeletingCollection) return;

    setShowDeleteCollectionModal(false);
    setActiveCollection(null);
  }, [isDeletingCollection]);

  const handleDeleteCollection = useCallback(async () => {
    if (!activeCollection) return;

    setIsDeletingCollection(true);

    try {
      await window.electron.hydraApi.delete(
        `/profile/games/collections/${activeCollection.id}`,
        { needsAuth: true }
      );

      if (selectedCollectionId === activeCollection.id) {
        handleCollectionSelect(null);
      }

      await Promise.all([loadCollections(), updateLibrary()]);
      showSuccessToast(t("collection_deleted"));
      handleCloseDeleteCollectionModal();
    } catch (error) {
      showErrorToast(
        resolveCollectionErrorMessage(error, "failed_delete_collection")
      );
    } finally {
      setIsDeletingCollection(false);
    }
  }, [
    activeCollection,
    selectedCollectionId,
    handleCollectionSelect,
    loadCollections,
    updateLibrary,
    showSuccessToast,
    t,
    handleCloseDeleteCollectionModal,
    showErrorToast,
    resolveCollectionErrorMessage,
  ]);

  const collectionContextMenuItems = useMemo(() => {
    const isCollectionActionBusy = isRenamingCollection || isDeletingCollection;

    return [
      {
        id: "rename-collection",
        label: t("rename_collection"),
        icon: <PencilIcon size={16} />,
        onClick: handleOpenRenameCollectionModal,
        disabled: isCollectionActionBusy,
      },
      {
        id: "delete-collection",
        label: t("delete_collection"),
        icon: <TrashIcon size={16} />,
        onClick: handleOpenDeleteCollectionModal,
        danger: true,
        disabled: isCollectionActionBusy,
      },
    ];
  }, [
    handleOpenDeleteCollectionModal,
    handleOpenRenameCollectionModal,
    isDeletingCollection,
    isRenamingCollection,
    t,
  ]);

  useEffect(() => {
    if (!selectedCollectionId) return;
    if (!hasLoadedCollections) return;

    if (selectedCollectionId === FAVORITES_COLLECTION_ID) return;

    const hasCollection =
      collections.some(
        (collection) => collection.id === selectedCollectionId
      ) || homeGroups.some((group) => group.id === selectedCollectionId);

    if (!hasCollection) {
      handleCollectionSelect(null);
    }
  }, [
    collections,
    homeGroups,
    selectedCollectionId,
    handleCollectionSelect,
    hasLoadedCollections,
  ]);

  const filteredLibrary = useMemo(() => {
    let filtered = library;

    if (selectedCollectionId) {
      if (selectedCollectionId === FAVORITES_COLLECTION_ID) {
        filtered = filtered.filter((game) => game.favorite);
      } else {
        const homeGroup = homeGroups.find((g) => g.id === selectedCollectionId);
        if (homeGroup) {
          filtered = filtered.filter((game) =>
            homeGroup.gameIds.includes(game.objectId)
          );
        } else {
          filtered = filtered.filter((game) =>
            getGameCollectionIds(game).includes(selectedCollectionId)
          );
        }
      }
    }

    if (!searchQuery.trim()) return filtered;

    const queryLower = searchQuery.toLowerCase();
    const expandedQuery = expandAcronym(queryLower);

    return filtered.filter((game) => {
      // Acronym match (exact or generated)
      if (matchesAcronym(queryLower, game.title)) return true;

      const compareTarget = expandedQuery || queryLower;
      const titleLower = game.title.toLowerCase();

      // Substring match against expanded query
      if (expandedQuery && titleLower.includes(expandedQuery)) return true;

      // Fuzzy character sequence match
      let queryIndex = 0;
      for (
        let i = 0;
        i < titleLower.length && queryIndex < compareTarget.length;
        i++
      ) {
        if (titleLower[i] === compareTarget[queryIndex]) {
          queryIndex++;
        }
      }

      return queryIndex === compareTarget.length;
    });
  }, [library, searchQuery, selectedCollectionId]);

  const sortedLibrary = useMemo(() => {
    return [...filteredLibrary].sort((a, b) => {
      switch (sortBy) {
        case "recently_played": {
          const aHasPlayed = a.lastTimePlayed !== null;
          const bHasPlayed = b.lastTimePlayed !== null;

          if (aHasPlayed && bHasPlayed) {
            const aLastPlayed = new Date(a.lastTimePlayed as Date).getTime();
            const bLastPlayed = new Date(b.lastTimePlayed as Date).getTime();
            const lastPlayedDifference = bLastPlayed - aLastPlayed;
            if (lastPlayedDifference !== 0) return lastPlayedDifference;
          } else if (aHasPlayed !== bHasPlayed) {
            return aHasPlayed ? -1 : 1;
          }

          break;
        }

        case "most_played": {
          const playTimeDifference =
            b.playTimeInMilliseconds - a.playTimeInMilliseconds;
          if (playTimeDifference !== 0) return playTimeDifference;
          break;
        }

        case "installed_first": {
          const aIsInstalled =
            Boolean(a.executablePath) || a.installedSizeInBytes != null;
          const bIsInstalled =
            Boolean(b.executablePath) || b.installedSizeInBytes != null;

          if (aIsInstalled !== bIsInstalled) {
            return aIsInstalled ? -1 : 1;
          }

          break;
        }

        case "title_desc": {
          return b.title.localeCompare(a.title, undefined, {
            sensitivity: "base",
          });
        }

        case "title_asc":
        default:
          break;
      }

      return a.title.localeCompare(b.title, undefined, {
        sensitivity: "base",
      });
    });
  }, [filteredLibrary, sortBy]);

  const libraryCollections = useMemo(() => {
    const getBestImage = (g: LibraryGame) =>
      g.customIconUrl || g.coverImageUrl || g.libraryImageUrl || g.iconUrl;

    return [
      ...collections.map((c) => {
        const cGames = library.filter((game) =>
          getGameCollectionIds(game).includes(c.id)
        );
        return {
          id: c.id,
          name: c.name,
          gamesCount: cGames.length,
          isHomeGroup: false,
          ref: c,
          previewGames: cGames.slice(0, 3).map(getBestImage),
        };
      }),
      ...homeGroups.map((g) => {
        const gGames = library.filter((game) =>
          g.gameIds.includes(game.objectId)
        );
        return {
          id: g.id,
          name: g.name,
          gamesCount: gGames.length,
          isHomeGroup: true,
          ref: g,
          previewGames: gGames.slice(0, 3).map(getBestImage),
        };
      }),
    ];
  }, [collections, homeGroups, library]);

  const hasGames = library.length > 0;
  const hasNoFilteredGames = sortedLibrary.length === 0;
  const isFavoritesCollectionSelected =
    selectedCollectionId === FAVORITES_COLLECTION_ID;
  const shouldShowFavoritesEmptyState =
    hasGames && isFavoritesCollectionSelected && hasNoFilteredGames;
  const shouldShowCollectionEmptyState =
    hasGames &&
    !shouldShowFavoritesEmptyState &&
    Boolean(selectedCollectionId) &&
    !isFavoritesCollectionSelected &&
    hasNoFilteredGames;

  return (
    <section className="library library__page">
      {hasGames && (
        <>
          <div
            className="library__filter-bar"
            data-gamepad-autofocus-skip="true"
          >
            <div className="library__controls-row">
              <div
                className="library__controls-left"
                style={{ flex: 1, minWidth: 200, maxWidth: "100%" }}
              >
                <div
                  className="header__search-bar header__search-bar--inline"
                  style={{
                    width: "100%",
                    padding: "8px 16px",
                    minWidth: "unset",
                  }}
                >
                  <SearchIcon size={16} className="header__search-bar-icon" />
                  <input
                    type="text"
                    className="header__search-input"
                    placeholder={t("search_library", {
                      ns: "header",
                      defaultValue: "Buscar na biblioteca...",
                    })}
                    value={searchQuery}
                    onChange={(e) =>
                      dispatch(setLibrarySearchQuery(e.target.value))
                    }
                  />
                </div>
              </div>
              <div className="library__controls-right">
                <FilterOptions
                  sortBy={sortBy}
                  onSortChange={handleSortChange}
                />
                <button
                  type="button"
                  className="library__favorites-btn"
                  onClick={() => setShowAddCustomGameModal(true)}
                  title={t("add_custom_game", {
                    defaultValue: "Adicionar jogo personalizado",
                  })}
                  aria-label="Adicionar jogo personalizado"
                >
                  <PlusIcon size={16} />
                </button>
                <button
                  type="button"
                  className="library__favorites-btn"
                  onClick={handleImportFromFolder}
                  title={t("import_from_folder", {
                    defaultValue: "Importar jogos de uma pasta",
                  })}
                >
                  <UploadIcon size={16} />
                </button>
                <button
                  type="button"
                  className={`library__favorites-btn ${
                    isFavoritesCollectionSelected
                      ? "library__favorites-btn--active"
                      : ""
                  }`}
                  onClick={() =>
                    handleCollectionSelect(
                      isFavoritesCollectionSelected
                        ? null
                        : FAVORITES_COLLECTION_ID
                    )
                  }
                  title={t("favorites")}
                  aria-pressed={isFavoritesCollectionSelected}
                >
                  <HeartIcon size={16} />
                </button>
                <ViewOptions
                  viewMode={viewMode}
                  onViewModeChange={handleViewModeChange}
                />
              </div>
            </div>
          </div>
        </>
      )}
      <div className="library__content">
        {hasGames && !selectedCollectionId && (
          <div className="library__folders-grid">
            {libraryCollections.map((collection) => (
              <button
                key={collection.id}
                type="button"
                className={`library__folder-card ${
                  selectedCollectionId === collection.id
                    ? "library__folder-card--active"
                    : ""
                }`}
                onClick={() =>
                  handleCollectionSelect(
                    selectedCollectionId === collection.id
                      ? null
                      : collection.id
                  )
                }
                onContextMenu={(event) => {
                  if (collection.isHomeGroup) return;
                  handleOpenCollectionContextMenu(
                    event,
                    collection.ref as GameCollection
                  );
                }}
              >
                <div className="library__folder-card-previews">
                  {collection.previewGames.length > 0 ? (
                    collection.previewGames.map((url, i) => (
                      <img
                        key={i}
                        src={url || ""}
                        alt="preview"
                        className="library__folder-preview-img"
                      />
                    ))
                  ) : (
                    <div className="library__folder-preview-empty">
                      <FileDirectoryIcon size={24} />
                    </div>
                  )}
                </div>
                <div className="library__folder-card-info">
                  <span className="library__folder-card-name">
                    {collection.name}
                  </span>
                  <span className="library__folder-card-count">
                    {collection.gamesCount}
                  </span>
                </div>
              </button>
            ))}
            <button
              type="button"
              className="library__folder-card library__folder-card--create"
              onClick={() => setShowCreateFolderModal(true)}
            >
              <div className="library__folder-card-previews">
                <div className="library__folder-preview-empty">
                  <span>+</span>
                </div>
              </div>
              <div className="library__folder-card-info">
                <span className="library__folder-card-name">
                  {t("create_folder", { defaultValue: "Criar pasta" })}
                </span>
              </div>
            </button>
          </div>
        )}

        {hasGames && selectedCollectionId && (
          <div className="library__folder-back-nav">
            <Button
              theme="outline"
              onClick={() => handleCollectionSelect(null)}
              className="library__folder-back-button"
            >
              <ChevronLeftIcon size={16} />
              {t("back", { defaultValue: "Voltar", ns: "shared" })}
            </Button>
            <div className="library__folder-back-info">
              <FileDirectoryIcon size={24} />
              <h2 style={{ margin: 0 }}>
                {selectedCollectionId === FAVORITES_COLLECTION_ID
                  ? t("favorites")
                  : libraryCollections.find(
                      (c) => c.id === selectedCollectionId
                    )?.name}
              </h2>
            </div>

            {homeGroups.some((g) => g.id === selectedCollectionId) && (
              <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                <Button
                  theme="outline"
                  onClick={() =>
                    setFolderToEdit(
                      homeGroups.find((g) => g.id === selectedCollectionId) ??
                        null
                    )
                  }
                >
                  <PlusIcon size={16} />
                  Adicionar jogos
                </Button>
                <Button
                  theme="danger"
                  onClick={() => {
                    deleteGroup(selectedCollectionId!);
                    handleCollectionSelect(null);
                  }}
                >
                  <TrashIcon size={16} />
                  Excluir pasta
                </Button>
              </div>
            )}
          </div>
        )}

        {!hasGames && (
          <div className="library__no-games">
            <div className="library__telescope-icon">
              <TelescopeIcon size={24} />
            </div>
            <h2>{t("no_games_title")}</h2>
            <p>{t("no_games_description")}</p>
          </div>
        )}

        {shouldShowFavoritesEmptyState && (
          <div className="library__empty">
            <div className="library__icon-container">
              <HeartIcon size={24} />
            </div>
            <h2>{t("empty_favorites_title")}</h2>
            <p>{t("empty_favorites_description")}</p>
          </div>
        )}

        {shouldShowCollectionEmptyState && (
          <div className="library__empty">
            <div className="library__icon-container">
              <FileDirectoryIcon size={24} />
            </div>
            <h2>{t("empty_collection_title")}</h2>
            <p>{t("empty_collection_description")}</p>
          </div>
        )}

        {hasGames &&
          !shouldShowFavoritesEmptyState &&
          !shouldShowCollectionEmptyState && (
            <AnimatePresence mode="wait">
              {viewMode === "compact" && (
                <motion.div
                  key={`${sortBy}-catalogue`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <LibraryCatalogueView
                    games={sortedLibrary}
                    onContextMenu={handleOpenContextMenu}
                    onToggleFavorite={handleToggleFavorite}
                    onRemoveFromLibrary={setGameToRemove}
                  />
                </motion.div>
              )}

              {viewMode === "grid" && (
                <motion.ul
                  key={`${sortBy}-grid`}
                  className="library__games-grid library__games-grid--grid"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  {sortedLibrary.map((game) => (
                    <li
                      key={`${game.shop}-${game.objectId}`}
                      style={{ listStyle: "none" }}
                    >
                      <LibraryGameCard
                        game={game}
                        onMouseEnter={handleOnMouseEnterGameCard}
                        onMouseLeave={handleOnMouseLeaveGameCard}
                        onContextMenu={handleOpenContextMenu}
                        onToggleFavorite={handleToggleFavorite}
                        onRemoveFromLibrary={setGameToRemove}
                      />
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          )}

        {gameContextMenu.game && (
          <GameContextMenu
            game={gameContextMenu.game}
            visible={gameContextMenu.visible}
            position={gameContextMenu.position}
            onClose={handleCloseContextMenu}
          />
        )}

        <ContextMenu
          items={collectionContextMenuItems}
          visible={collectionContextMenu.visible}
          position={collectionContextMenu.position}
          onClose={handleCloseCollectionContextMenu}
        />

        {gameToRemove && (
          <ConfirmationModal
            visible={!!gameToRemove}
            title={t("remove_from_library_title", {
              ns: "game_details",
              defaultValue: "Remover da biblioteca",
            })}
            descriptionText={t("remove_from_library_description", {
              ns: "game_details",
              defaultValue: `Tem certeza que deseja remover {{game}} da biblioteca?`,
              game: gameToRemove.title,
            })}
            onClose={() => setGameToRemove(null)}
            onConfirm={() => handleRemoveFromLibrary(gameToRemove)}
            cancelButtonLabel={t("cancel", { ns: "sidebar" })}
            confirmButtonLabel={t("remove", {
              ns: "game_details",
              defaultValue: "Remover",
            })}
            buttonsIsDisabled={isRemovingGame}
          />
        )}

        <Modal
          visible={showRenameCollectionModal}
          title={t("rename_collection")}
          description={t("rename_collection_description")}
          onClose={handleCloseRenameCollectionModal}
        >
          <div className="library__collection-modal">
            <TextField
              label={t("collection_name", { ns: "sidebar" })}
              placeholder={t("collection_name_placeholder", { ns: "sidebar" })}
              value={collectionName}
              onChange={(event) => setCollectionName(event.target.value)}
              theme="dark"
              disabled={isRenamingCollection}
              maxLength={60}
            />

            <div className="library__collection-modal-actions">
              <Button
                type="button"
                theme="outline"
                onClick={handleCloseRenameCollectionModal}
                disabled={isRenamingCollection}
              >
                {t("cancel", { ns: "sidebar" })}
              </Button>

              <Button
                type="button"
                theme="primary"
                onClick={handleRenameCollection}
                disabled={!collectionName.trim() || isRenamingCollection}
              >
                {isRenamingCollection
                  ? t("renaming_collection")
                  : t("rename_collection")}
              </Button>
            </div>
          </div>
        </Modal>

        <ConfirmationModal
          visible={showDeleteCollectionModal}
          title={t("delete_collection_title")}
          descriptionText={t("delete_collection_description", {
            collectionName: activeCollection?.name ?? "",
          })}
          onClose={handleCloseDeleteCollectionModal}
          onConfirm={() => {
            void handleDeleteCollection();
          }}
          cancelButtonLabel={t("cancel", { ns: "sidebar" })}
          confirmButtonLabel={t("delete_collection")}
          buttonsIsDisabled={isDeletingCollection}
        />

        <Modal
          visible={showCreateFolderModal}
          title={t("create_folder", { defaultValue: "Criar pasta" })}
          description={t("create_folder_description", {
            defaultValue: "Dê um nome para a sua nova pasta.",
          })}
          onClose={() => setShowCreateFolderModal(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newFolderName.trim()) {
                createGroup(newFolderName.trim());
                setNewFolderName("");
                setShowCreateFolderModal(false);
              }
            }}
          >
            <div className="library__collection-modal">
              <TextField
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder={t("folder_name", {
                  defaultValue: "Nome da pasta",
                })}
                label={t("folder_name", { defaultValue: "Nome da pasta" })}
              />

              <div className="library__collection-modal-actions">
                <Button
                  type="button"
                  theme="outline"
                  onClick={() => setShowCreateFolderModal(false)}
                >
                  {t("cancel", { defaultValue: "Cancelar", ns: "shared" })}
                </Button>
                <Button type="submit" theme="primary">
                  {t("create", { defaultValue: "Criar", ns: "shared" })}
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      </div>

      {folderToEdit && (
        <CreateFolderModal
          visible={!!folderToEdit}
          initialName={folderToEdit.name}
          initialSelectedIds={folderToEdit.gameIds}
          games={
            library.map((g) => ({
              ...g,
              libraryImageUrl: g.libraryImageUrl ?? null,
            })) as any
          }
          onClose={() => setFolderToEdit(null)}
          onCreate={(name, gameIds) => {
            updateGroup(folderToEdit.id, name, gameIds);
            setFolderToEdit(null);
          }}
        />
      )}

      <AddCustomGameModal
        visible={showAddCustomGameModal}
        onClose={() => setShowAddCustomGameModal(false)}
      />
    </section>
  );
}
