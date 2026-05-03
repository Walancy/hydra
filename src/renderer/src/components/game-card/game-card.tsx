import { DownloadIcon, PeopleIcon, QuestionIcon } from "@primer/octicons-react";
import type { GameStats, ShopAssets } from "@types";

import SteamLogo from "@renderer/assets/steam-logo.svg?react";

import "./game-card.scss";

import { useTranslation } from "react-i18next";
import { Badge } from "../badge/badge";
import { StarRating } from "../star-rating/star-rating";
import { useCallback, useState, useEffect, useMemo } from "react";
import { useFormat } from "@renderer/hooks";
import { useSteamGridCover } from "@renderer/hooks/use-steamgrid-cover";
import Skeleton from "react-loading-skeleton";
import { globalImageCache } from "@renderer/helpers";
import { useRef } from "react";

export interface GameCardProps
  extends React.DetailedHTMLProps<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  > {
  game: ShopAssets;
}

const shopIcon = {
  steam: <SteamLogo className="game-card__shop-icon" />,
};

export function GameCard({ game, ...props }: GameCardProps) {
  const { t } = useTranslation("game_card");

  const [stats, setStats] = useState<GameStats | null>(null);

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

  const customCover = resolveImageSource(game.coverImageUrl);
  const customLibrary = resolveImageSource(game.libraryImageUrl);
  const customIcon = resolveImageSource(game.iconUrl);

  const initialPrimarySrc =
    game.shop === "steam"
      ? `https://steamcdn-a.akamaihd.net/steam/apps/${game.objectId}/library_600x900_2x.jpg`
      : (customCover ?? customLibrary ?? customIcon ?? null);

  const [fallbackIndex, setFallbackIndex] = useState(0);
  const [finalFailed, setFinalFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

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
    sources.push(customIcon);

    return Array.from(new Set(sources.filter(Boolean))) as string[];
  }, [
    initialPrimarySrc,
    steamGridUrl,
    customLibrary,
    customCover,
    game,
    steamHeader,
    customIcon,
  ]);

  const activeSrc =
    fallbackIndex === 0
      ? initialPrimarySrc
      : fallbackIndex > 0 && steamGridUrl === undefined
        ? undefined
        : fallbackSources[fallbackIndex];

  const resolvedSrc = activeSrc || undefined;

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
      if (imgRef.current.naturalWidth > 1) {
        globalImageCache.add(resolvedSrc);
        setImageLoaded(true);
      } else {
        handleImageError();
      }
    }
  }, [resolvedSrc, handleImageError]);

  const handleHover = useCallback(() => {
    if (!stats) {
      window.electron.getGameStats(game.objectId, game.shop).then((stats) => {
        setStats(stats);
      });
    }
  }, [game, stats]);

  const { numberFormatter } = useFormat();

  return (
    <button
      {...props}
      type="button"
      className="game-card"
      onMouseEnter={handleHover}
      onFocus={handleHover}
    >
      <div className="game-card__backdrop" style={{ position: "relative" }}>
        {finalFailed ||
        (!resolvedSrc &&
          steamGridUrl !== undefined &&
          fallbackIndex >= fallbackSources.length) ? (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#1c1c1c",
            }}
          >
            <QuestionIcon size={40} fill="#444" />
          </div>
        ) : (
          <>
            {!imageLoaded && (
              <Skeleton
                className="game-card__cover"
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 2,
                  borderRadius: "inherit",
                  height: "100%",
                }}
              />
            )}
            {resolvedSrc !== undefined && (
              <img
                ref={imgRef}
                key={resolvedSrc}
                src={resolvedSrc}
                alt={game.title}
                className="game-card__cover"
                loading="lazy"
                onLoad={(e) => {
                  if (e.currentTarget.naturalWidth <= 1) {
                    handleImageError();
                  } else {
                    if (resolvedSrc) globalImageCache.add(resolvedSrc);
                    setImageLoaded(true);
                  }
                }}
                style={{
                  position: "relative",
                  zIndex: 1,
                  opacity: imageLoaded ? 1 : 0,
                  transition: "opacity 0.3s ease",
                }}
                onError={handleImageError}
              />
            )}
          </>
        )}

        <div className="game-card__content">
          <div className="game-card__title-container">
            {shopIcon[game.shop]}
            <p className="game-card__title">{game.title}</p>
          </div>

          {game.downloadSources.length > 0 ? (
            <ul className="game-card__download-options">
              {game.downloadSources.slice(0, 3).map((sourceName) => (
                <li key={sourceName}>
                  <Badge>{sourceName}</Badge>
                </li>
              ))}
              {game.downloadSources.length > 3 && (
                <li>
                  <Badge>
                    +{game.downloadSources.length - 3}{" "}
                    {t("game_card:available", {
                      count: game.downloadSources.length - 3,
                    })}
                  </Badge>
                </li>
              )}
            </ul>
          ) : (
            <p className="game-card__no-download-label">{t("no_downloads")}</p>
          )}

          <div className="game-card__specifics">
            <div className="game-card__specifics-item">
              <DownloadIcon />
              <span>
                {stats ? numberFormatter.format(stats.downloadCount) : "…"}
              </span>
            </div>
            <div className="game-card__specifics-item">
              <PeopleIcon />
              <span>
                {stats ? numberFormatter.format(stats.playerCount) : "…"}
              </span>
            </div>
            <div className="game-card__specifics-item">
              <StarRating rating={stats?.averageScore || null} size={14} />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
