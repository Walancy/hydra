import { Badge } from "@renderer/components/badge/badge";
import { buildGameDetailsPath } from "@renderer/helpers";
import { useAppSelector, useLibrary } from "@renderer/hooks";
import { lazy, Suspense, useMemo, useState, useEffect } from "react";
import { Link } from "@renderer/components/link/link";

import "./game-item.scss";
import { useTranslation } from "react-i18next";
import { CatalogueSearchResult } from "@types";
import { QuestionIcon, PlusIcon, DashIcon } from "@primer/octicons-react";
import cn from "classnames";
import { Button } from "@renderer/components/button/button";

const ProtonDBBadge = lazy(async () => {
  const mod = await import("./protondb-badge");
  return { default: mod.ProtonDBBadge };
});

export interface GameItemProps {
  game: CatalogueSearchResult;
}

export function GameItem({ game }: GameItemProps) {
  const { i18n, t } = useTranslation("game_details");

  const language = i18n.language.split("-")[0];

  const { steamGenres } = useAppSelector((state) => state.catalogueSearch);

  const [isAddingToLibrary, setIsAddingToLibrary] = useState(false);
  const [added, setAdded] = useState(false);
  const [isAnimatingAdd, setIsAnimatingAdd] = useState(false);

  const { library, updateLibrary } = useLibrary();
  const shouldShowProtonFeatures = window.electron.platform === "linux";

  useEffect(() => {
    const exists = library.some(
      (libItem) =>
        libItem.shop === game.shop && libItem.objectId === game.objectId
    );
    setAdded(exists);
  }, [library, game.shop, game.objectId]);

  const addGameToLibrary = async () => {
    if (added || isAddingToLibrary) return;

    setIsAddingToLibrary(true);

    try {
      await window.electron.addGameToLibrary(
        game.shop,
        game.objectId,
        game.title
      );
      updateLibrary();
      setIsAnimatingAdd(true);
      setTimeout(() => setIsAnimatingAdd(false), 300);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAddingToLibrary(false);
    }
  };

  const removeGameFromLibrary = async () => {
    setIsAddingToLibrary(true);

    try {
      await window.electron.removeGameFromLibrary(game.shop, game.objectId);
      updateLibrary();
    } catch (_error) {
      // falha silenciosa: a remoção da biblioteca não é crítica
    } finally {
      setIsAddingToLibrary(false);
    }
  };

  const genres = useMemo(() => {
    return game.genres?.map((genre) => {
      const index = steamGenres["en"]?.findIndex(
        (steamGenre) => steamGenre === genre
      );

      if (
        index !== undefined &&
        steamGenres[language] &&
        steamGenres[language][index]
      ) {
        return steamGenres[language][index];
      }

      return genre;
    });
  }, [game.genres, language, steamGenres]);

  const libraryImage = useMemo(() => {
    if (game.libraryImageUrl) {
      return (
        <img
          className="game-item__cover"
          src={game.libraryImageUrl}
          alt={game.title}
          loading="lazy"
        />
      );
    }

    return (
      <div className="game-item__cover-placeholder">
        <QuestionIcon size={28} />
      </div>
    );
  }, [game.libraryImageUrl, game.title]);

  const rawProtonValue =
    game.tier ??
    game.bestReportedTier ??
    game.protondbSupportBadge ??
    game.protondbSupportBadges?.[0] ??
    null;
  const protonBadgeValue = rawProtonValue?.toLowerCase().trim() ?? null;
  const protonBadge =
    protonBadgeValue &&
    ["borked", "bronze", "silver", "gold", "platinum"].includes(
      protonBadgeValue
    )
      ? protonBadgeValue
      : null;

  return (
    <article className="game-item">
      <Link to={buildGameDetailsPath(game)} className="game-item__content-link">
        <div className="game-item__cover-wrapper">
          {libraryImage}

          {shouldShowProtonFeatures && protonBadge && (
            <Suspense fallback={null}>
              <ProtonDBBadge badge={protonBadge} />
            </Suspense>
          )}

          <Button
            theme="primary"
            className={cn("game-item__action-btn", {
              "game-item__action-btn--animated": isAnimatingAdd,
            })}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              added ? removeGameFromLibrary() : addGameToLibrary();
            }}
            title={
              added
                ? t("remove_from_library", { defaultValue: "Remover" })
                : t("add_to_library")
            }
            aria-label={
              added
                ? t("remove_from_library", { defaultValue: "Remover" })
                : t("add_to_library")
            }
            disabled={isAddingToLibrary}
          >
            {added ? <DashIcon size={16} /> : <PlusIcon size={16} />}
          </Button>
        </div>

        <div className="game-item__details">
          <div className="game-item__title-row">
            <span className="game-item__title">{game.title}</span>
          </div>
          <span className="game-item__genres">{genres.join(", ")}</span>

          <div className="game-item__repackers">
            {game.downloadSources.map((sourceName) => (
              <Badge key={sourceName}>{sourceName}</Badge>
            ))}
          </div>
        </div>
      </Link>
    </article>
  );
}
