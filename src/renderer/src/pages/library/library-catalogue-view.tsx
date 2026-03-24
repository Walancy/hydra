import { useNavigate } from "react-router-dom";
import { useGameCard } from "@renderer/hooks/use-game-card";
import { memo, useCallback, useMemo, useState } from "react";
import {
  QuestionIcon,
  HeartIcon,
  ClockIcon,
  TrophyIcon,
  HeartFillIcon,
} from "@primer/octicons-react";
import { LibraryGame } from "@types";
import { buildGameDetailsPath } from "@renderer/helpers";
import "./library-catalogue-view.scss";

interface LibraryCatCardProps {
  game: LibraryGame;
  onContextMenu: (
    game: LibraryGame,
    position: { x: number; y: number }
  ) => void;
  onToggleFavorite: (game: LibraryGame) => void;
}

const LibraryCatCard = memo(function LibraryCatCard({
  game,
  onContextMenu,
  onToggleFavorite,
}: Readonly<LibraryCatCardProps>) {
  const navigate = useNavigate();
  const { formatPlayTime, handleContextMenuClick } = useGameCard(
    game,
    onContextMenu
  );

  const [imgError, setImgError] = useState(false);

  // Landscape image priority (same as catalogue)
  const coverSrc = !imgError
    ? game.libraryImageUrl ||
      game.coverImageUrl ||
      game.customIconUrl ||
      game.iconUrl ||
      ""
    : "";

  const handleClick = () => {
    navigate(
      buildGameDetailsPath({
        objectId: game.objectId,
        shop: game.shop,
        title: game.title,
      })
    );
  };

  const handleFavorite = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onToggleFavorite(game);
    },
    [game, onToggleFavorite]
  );

  const achievementPercent =
    (game.achievementCount ?? 0) > 0
      ? Math.round(
          ((game.unlockedAchievementCount ?? 0) / (game.achievementCount ?? 1)) *
            100
        )
      : null;

  return (
    <div
      className="lib-cat-card"
      onClick={handleClick}
      onContextMenu={handleContextMenuClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      aria-label={game.title}
    >
      {/* Cover image */}
      <div className="lib-cat-card__cover-wrap">
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={game.title}
            className="lib-cat-card__cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="lib-cat-card__placeholder">
            <QuestionIcon size={24} />
          </div>
        )}

        {/* Favorite button */}
        <button
          type="button"
          className={`lib-cat-card__fav-btn${game.favorite ? " lib-cat-card__fav-btn--active" : ""}`}
          onClick={handleFavorite}
          aria-label={game.favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          title={game.favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        >
          {game.favorite ? <HeartFillIcon size={11} /> : <HeartIcon size={11} />}
        </button>
      </div>

      {/* Info strip */}
      <div className="lib-cat-card__info">
        <span className="lib-cat-card__title">{game.title}</span>

        <div className="lib-cat-card__meta">
          {/* Play time */}
          <span className="lib-cat-card__meta-item" title="Tempo jogado">
            <ClockIcon size={10} />
            <span>{formatPlayTime(game.playTimeInMilliseconds, true)}</span>
          </span>

          {/* Achievements */}
          {achievementPercent !== null && (
            <span className="lib-cat-card__meta-item lib-cat-card__meta-item--trophy" title="Conquistas">
              <TrophyIcon size={10} />
              <span>{achievementPercent}%</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

interface LibraryCatalogueViewProps {
  games: LibraryGame[];
  onContextMenu: (
    game: LibraryGame,
    position: { x: number; y: number }
  ) => void;
  onToggleFavorite: (game: LibraryGame) => void;
}

export function LibraryCatalogueView({
  games,
  onContextMenu,
  onToggleFavorite,
}: Readonly<LibraryCatalogueViewProps>) {
  const favorites = useMemo(() => games.filter((g) => g.favorite), [games]);
  const others = useMemo(() => games.filter((g) => !g.favorite), [games]);

  return (
    <div className="lib-cat-view">
      {favorites.length > 0 && (
        <section className="lib-cat-view__section">
          <h2 className="lib-cat-view__section-title">
            <HeartIcon size={14} className="lib-cat-view__section-icon" />
            Favoritos
          </h2>
          <div className="lib-cat-view__grid">
            {favorites.map((game) => (
              <LibraryCatCard
                key={`${game.shop}-${game.objectId}`}
                game={game}
                onContextMenu={onContextMenu}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section className="lib-cat-view__section">
          {favorites.length > 0 && (
            <h2 className="lib-cat-view__section-title">Outros jogos</h2>
          )}
          <div className="lib-cat-view__grid">
            {others.map((game) => (
              <LibraryCatCard
                key={`${game.shop}-${game.objectId}`}
                game={game}
                onContextMenu={onContextMenu}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
