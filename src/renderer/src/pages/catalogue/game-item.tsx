import { Badge } from "@renderer/components/badge/badge";
import { buildGameDetailsPath } from "@renderer/helpers";
import { useAppSelector, useLibrary } from "@renderer/hooks";
import { lazy, Suspense, useMemo, useState, useEffect, useRef } from "react";
import { useSteamGridCover } from "@renderer/hooks/use-steamgrid-cover";
import { Link } from "@renderer/components/link/link";

import "./game-item.scss";
import { useTranslation } from "react-i18next";
import { CatalogueSearchResult } from "@types";
import { QuestionIcon, PlusIcon, DashIcon } from "@primer/octicons-react";
import cn from "classnames";
import { Button } from "@renderer/components/button/button";
import Skeleton from "react-loading-skeleton";
import { globalImageCache } from "@renderer/helpers";

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

  const resolveImageSource = (
    imageUrl: string | null | undefined
  ): string | null => {
    if (!imageUrl) return null;
    const trimmed = imageUrl.trim();
    if (!trimmed) return null;
    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("data:") ||
      trimmed.startsWith("blob:")
    )
      return trimmed;
    if (trimmed.startsWith("local:"))
      return `local:${trimmed.slice("local:".length).replaceAll("\\", "/")}`;
    const normalized = trimmed.replaceAll("\\", "/");
    if (/^[A-Za-z]:\//.test(normalized) || normalized.startsWith("/"))
      return `local:${normalized}`;
    return normalized;
  };

  const customLibrary = resolveImageSource(game.libraryImageUrl);
  const customCover = resolveImageSource(game.coverImageUrl);

  const initialPrimarySrc =
    game.shop === "steam"
      ? `https://steamcdn-a.akamaihd.net/steam/apps/${game.objectId}/library_600x900_2x.jpg`
      : (customLibrary ?? customCover ?? null);

  const [fallbackIndex, setFallbackIndex] = useState(0);
  const [finalFailed, setFinalFailed] = useState(false);

  const steamGridUrl = useSteamGridCover(
    game.objectId,
    game.title,
    fallbackIndex > 0
  );

  const steamHeader =
    game.shop === "steam"
      ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.objectId}/header.jpg`
      : null;

  const fallbackSources = useMemo(() => {
    const sources: (string | null | undefined)[] = [initialPrimarySrc];

    if (steamGridUrl) sources.push(steamGridUrl);

    sources.push(customLibrary);
    sources.push(customCover);
    sources.push(game.libraryImageUrl);
    sources.push(game.coverImageUrl);

    if (game.shop === "steam") {
      sources.push(
        `https://steamcdn-a.akamaihd.net/steam/apps/${game.objectId}/library_600x900.jpg`
      );
      sources.push(
        `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.objectId}/capsule_616x353.jpg`
      );
      sources.push(steamHeader);
    }

    return Array.from(new Set(sources.filter(Boolean))) as string[];
  }, [
    initialPrimarySrc,
    steamGridUrl,
    customLibrary,
    customCover,
    game,
    steamHeader,
  ]);

  const activeSrc =
    fallbackIndex === 0
      ? initialPrimarySrc
      : fallbackIndex > 0 && steamGridUrl === undefined
        ? undefined
        : fallbackSources[fallbackIndex];

  const resolvedSrc = activeSrc || undefined;

  const imgRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(() =>
    resolvedSrc ? globalImageCache.has(resolvedSrc) : false
  );

  const handleImageError = useCallback(() => {
    if (fallbackIndex < fallbackSources.length - 1) {
      setFallbackIndex((prev) => prev + 1);
    } else {
      setFinalFailed(true);
    }
  }, [fallbackIndex, fallbackSources.length]);

  useEffect(() => {
    setImageLoaded(resolvedSrc ? globalImageCache.has(resolvedSrc) : false);

    if (resolvedSrc && imgRef.current?.complete) {
      if (imgRef.current.naturalWidth > 0) {
        globalImageCache.add(resolvedSrc);
        setImageLoaded(true);
      } else {
        handleImageError();
      }
    }
  }, [resolvedSrc, handleImageError]);

  const libraryImage = useMemo(() => {
    if (
      finalFailed ||
      (!resolvedSrc &&
        steamGridUrl !== undefined &&
        fallbackIndex >= fallbackSources.length)
    ) {
      return (
        <div className="game-item__cover-placeholder">
          <QuestionIcon size={28} />
        </div>
      );
    }

    return (
      <>
        {!imageLoaded && (
          <Skeleton
            className="game-item__cover"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              borderRadius: "inherit",
            }}
          />
        )}
        {resolvedSrc !== undefined && (
          <img
            ref={imgRef}
            key={resolvedSrc}
            className="game-item__cover"
            src={resolvedSrc}
            alt={game.title}
            loading="lazy"
            onError={handleImageError}
            onLoad={(e) => {
              if (e.currentTarget.naturalWidth <= 1) {
                handleImageError();
              } else {
                if (resolvedSrc) globalImageCache.add(resolvedSrc);
                setImageLoaded(true);
              }
            }}
            style={{
              opacity: imageLoaded ? 1 : 0,
              transition: "opacity 0.3s ease",
            }}
          />
        )}
      </>
    );
  }, [
    resolvedSrc,
    game.title,
    imageLoaded,
    finalFailed,
    fallbackIndex,
    fallbackSources.length,
    handleImageError,
    steamGridUrl,
  ]);

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
        <div
          className="game-item__cover-wrapper"
          style={{ position: "relative" }}
        >
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
