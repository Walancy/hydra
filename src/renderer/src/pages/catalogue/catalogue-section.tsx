import { useNavigate } from "react-router-dom";
import { useAppSelector, useLibrary } from "@renderer/hooks";
import { useEffect, useState, useCallback } from "react";
import { PlusIcon, DashIcon, QuestionIcon } from "@primer/octicons-react";
import type { CatalogueSearchResult } from "@types";
import { buildGameDetailsPath } from "@renderer/helpers";
import "./catalogue-section.scss";
import cn from "classnames";

interface CatalogueSectionProps {
  title: string;
  games: CatalogueSearchResult[];
  isLoading?: boolean;
}

function CatalogueCard({ game }: Readonly<{ game: CatalogueSearchResult }>) {
  const navigate = useNavigate();
  const { library, updateLibrary } = useLibrary();
  const { steamGenres } = useAppSelector((s) => s.catalogueSearch);
  const [added, setAdded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    setAdded(
      library.some((l) => l.shop === game.shop && l.objectId === game.objectId)
    );
  }, [library, game]);

  const handleLibrary = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isBusy) return;
      setIsBusy(true);
      try {
        if (added) {
          await window.electron.removeGameFromLibrary(game.shop, game.objectId);
        } else {
          await window.electron.addGameToLibrary(
            game.shop,
            game.objectId,
            game.title
          );
          setIsAnimating(true);
          setTimeout(() => setIsAnimating(false), 300);
        }
        updateLibrary();
      } finally {
        setIsBusy(false);
      }
    },
    [added, isBusy, game, updateLibrary]
  );

  const genres = game.genres
    ?.map((g) => {
      const enIdx = steamGenres["en"]?.indexOf(g);
      return enIdx !== undefined && enIdx >= 0
        ? (steamGenres["pt"]?.[enIdx] ?? g)
        : g;
    })
    .slice(0, 3);

  return (
    <article
      className="cat-card"
      onClick={() => navigate(buildGameDetailsPath(game))}
      role="button"
      tabIndex={0}
      onKeyDown={(e) =>
        e.key === "Enter" && navigate(buildGameDetailsPath(game))
      }
      aria-label={game.title}
    >
      {/* Cover image area - fixed ratio */}
      <div className="cat-card__cover-wrap">
        {game.libraryImageUrl ? (
          <img
            src={game.libraryImageUrl}
            alt={game.title}
            className="cat-card__cover"
            loading="lazy"
          />
        ) : (
          <div className="cat-card__placeholder">
            <QuestionIcon size={28} />
          </div>
        )}

        <button
          type="button"
          className={cn("cat-card__action-btn", {
            "cat-card__action-btn--animate": isAnimating,
          })}
          onClick={handleLibrary}
          disabled={isBusy}
          aria-label={
            added ? "Remover da biblioteca" : "Adicionar à biblioteca"
          }
        >
          {added ? <DashIcon size={14} /> : <PlusIcon size={14} />}
        </button>
      </div>

      {/* Info strip - fixed height */}
      <div className="cat-card__info">
        <div className="cat-card__top">
          <span className="cat-card__title">{game.title}</span>
          <div className="cat-card__sources">
            {game.downloadSources?.slice(0, 2).map((s) => (
              <span key={s} className="cat-card__source-badge">
                {s}
              </span>
            ))}
          </div>
        </div>
        <span className="cat-card__genres">
          {genres?.length > 0 ? genres.join(", ") : "\u00A0"}
        </span>
      </div>
    </article>
  );
}

export function CatalogueSection({
  title,
  games,
  isLoading = false,
}: Readonly<CatalogueSectionProps>) {
  if (!isLoading && !games.length) return null;

  return (
    <section className="cat-section">
      <div className="cat-section__header">
        <h2 className="cat-section__title">{title}</h2>
      </div>

      <div className="cat-section__grid">
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="cat-card cat-card--skeleton">
                <div className="cat-card__cover-wrap cat-card__skeleton-img" />
                <div className="cat-card__info">
                  <div className="cat-card__skeleton-line" />
                  <div className="cat-card__skeleton-line cat-card__skeleton-line--short" />
                </div>
              </div>
            ))
          : games.map((game) => (
              <CatalogueCard key={game.id ?? game.objectId} game={game} />
            ))}
      </div>
    </section>
  );
}
