import { DownloadIcon, PeopleIcon } from "@primer/octicons-react";
import type { GameStats, ShopAssets } from "@types";

import SteamLogo from "@renderer/assets/steam-logo.svg?react";

import "./game-card.scss";

import { useTranslation } from "react-i18next";
import { Badge } from "../badge/badge";
import { StarRating } from "../star-rating/star-rating";
import { useCallback, useState, useEffect } from "react";
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

  const [primaryFailed, setPrimaryFailed] = useState(!initialPrimarySrc);

  const [finalFailed, setFinalFailed] = useState(false);

  const steamGridUrl = useSteamGridCover(
    game.objectId,
    game.title,
    primaryFailed
  );

  const primarySrc =
    game.shop === "steam"
      ? `https://steamcdn-a.akamaihd.net/steam/apps/${game.objectId}/library_600x900_2x.jpg`
      : (customCover ?? customLibrary ?? customIcon ?? null);

  const activeSrc = primaryFailed
    ? (steamGridUrl ?? customCover ?? customLibrary ?? customIcon ?? null)
    : primarySrc;

  const resolvedSrc = activeSrc || game.libraryImageUrl || undefined;

  const imgRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(() =>
    resolvedSrc ? globalImageCache.has(resolvedSrc) : false
  );

  useEffect(() => {
    setImageLoaded(resolvedSrc ? globalImageCache.has(resolvedSrc) : false);
    if (
      resolvedSrc &&
      imgRef.current?.complete &&
      imgRef.current.naturalWidth > 0
    ) {
      globalImageCache.add(resolvedSrc);
      setImageLoaded(true);
    }
  }, [resolvedSrc]);

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
        {!finalFailed && activeSrc ? (
          <img
            ref={imgRef}
            key={activeSrc}
            src={activeSrc}
            alt={game.title}
            className="game-card__cover"
            loading="lazy"
            onLoad={() => {
              if (activeSrc) globalImageCache.add(activeSrc);
              setImageLoaded(true);
            }}
            style={{
              position: "relative",
              zIndex: 1,
              opacity: imageLoaded ? 1 : 0,
              transition: "opacity 0.3s ease",
            }}
            onError={() => {
              if (!primaryFailed) {
                setPrimaryFailed(true);
              } else {
                setFinalFailed(true);
              }
            }}
          />
        ) : (
          <img
            ref={imgRef}
            key={game.libraryImageUrl ?? "placeholder"}
            src={game.libraryImageUrl ?? undefined}
            alt={game.title}
            className="game-card__cover"
            loading="lazy"
            onLoad={() => {
              if (game.libraryImageUrl)
                globalImageCache.add(game.libraryImageUrl);
              setImageLoaded(true);
            }}
            style={{
              position: "relative",
              zIndex: 1,
              opacity: imageLoaded ? 1 : 0,
              transition: "opacity 0.3s ease",
            }}
          />
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
