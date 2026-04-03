import { LibraryGame } from "@types";
import { useGameCard } from "@renderer/hooks";
import { memo, useCallback, useEffect, useState } from "react";
import {
  ClockIcon,
  AlertFillIcon,
  TrophyIcon,
  ImageIcon,
  HeartIcon,
  HeartFillIcon,
  DashIcon,
} from "@primer/octicons-react";
import "./library-game-card.scss";
import { logger } from "@renderer/logger";

interface LibraryGameCardProps {
  game: LibraryGame;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onContextMenu: (
    game: LibraryGame,
    position: { x: number; y: number }
  ) => void;
  onShowTooltip?: (gameId: string) => void;
  onHideTooltip?: () => void;
  onToggleFavorite?: (game: LibraryGame) => void;
  onRemoveFromLibrary?: (game: LibraryGame) => void;
}

export const LibraryGameCard = memo(function LibraryGameCard({
  game,
  onMouseEnter,
  onMouseLeave,
  onContextMenu,
  onToggleFavorite,
  onRemoveFromLibrary,
}: Readonly<LibraryGameCardProps>) {
  const { formatPlayTime, handleCardClick, handleContextMenuClick } =
    useGameCard(game, onContextMenu);

  const handleFavClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onToggleFavorite?.(game);
    },
    [game, onToggleFavorite]
  );

  const handleRemoveClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onRemoveFromLibrary?.(game);
    },
    [game, onRemoveFromLibrary]
  );

  const sources = [
    game.customIconUrl,
    game.coverImageUrl,
    game.libraryImageUrl,
    game.iconUrl,
  ].filter((url) => url && url.trim() !== "");

  const [fallbackIndex, setFallbackIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const resolveImageSource = (imageUrl: string | null | undefined): string => {
    if (!imageUrl) return "";
    const trimmed = imageUrl.trim();
    if (!trimmed) return "";
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

  const activeImageSource = resolveImageSource(sources[fallbackIndex]);

  const handleImageError = () => {
    logger.warn(`Image failed to load for ${game.title}`, {
      failedUrl: sources[fallbackIndex],
      level: fallbackIndex,
    });
    if (fallbackIndex < sources.length - 1) {
      setFallbackIndex((prev) => prev + 1);
    } else {
      setImageError(true);
    }
  };

  useEffect(() => {
    setFallbackIndex(0);
    setImageError(false);
  }, [game.id]);

  const achievementPercent =
    (game.achievementCount ?? 0) > 0
      ? Math.round(
          ((game.unlockedAchievementCount ?? 0) /
            (game.achievementCount ?? 1)) *
            100
        )
      : null;

  return (
    <button
      type="button"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onMouseEnter}
      onBlur={onMouseLeave}
      className="library-game-card__wrapper"
      title={game.title}
      onClick={handleCardClick}
      onContextMenu={handleContextMenuClick}
    >
      {/* Image */}
      {imageError || !activeImageSource ? (
        <div className="library-game-card__cover-placeholder">
          <ImageIcon size={32} />
        </div>
      ) : (
        <img
          src={activeImageSource}
          alt={game.title}
          className="library-game-card__game-image"
          loading="lazy"
          onError={handleImageError}
        />
      )}

      {/* Gradient overlay with info at bottom */}
      <div className="library-game-card__overlay">
        {/* Action buttons — top right */}
        <div className="library-game-card__actions">
          {onToggleFavorite && (
            <button
              type="button"
              className={`library-game-card__fav-btn${game.favorite ? " library-game-card__fav-btn--active" : ""}`}
              onClick={handleFavClick}
              aria-label={game.favorite ? "Remover dos favoritos" : "Favoritar"}
              title={game.favorite ? "Remover dos favoritos" : "Favoritar"}
            >
              {game.favorite ? (
                <HeartFillIcon size={11} />
              ) : (
                <HeartIcon size={11} />
              )}
            </button>
          )}

          {onRemoveFromLibrary && (
            <button
              type="button"
              className="library-game-card__remove-btn"
              onClick={handleRemoveClick}
              aria-label="Remover da biblioteca"
              title="Remover da biblioteca"
            >
              <DashIcon size={11} />
            </button>
          )}
        </div>

        {/* Info strip at bottom */}
        <div className="library-game-card__info">
          <span className="library-game-card__info-title">{game.title}</span>
          <div className="library-game-card__meta">
            <span className="library-game-card__meta-item" title="Tempo jogado">
              {game.hasManuallyUpdatedPlaytime ? (
                <AlertFillIcon
                  size={10}
                  className="library-game-card__manual-playtime"
                />
              ) : (
                <ClockIcon size={10} />
              )}
              <span>{formatPlayTime(game.playTimeInMilliseconds, true)}</span>
            </span>

            {achievementPercent !== null && (
              <span
                className="library-game-card__meta-item library-game-card__meta-item--trophy"
                title="Conquistas"
              >
                <TrophyIcon size={10} />
                <span>{achievementPercent}%</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
});
