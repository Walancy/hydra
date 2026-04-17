import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { CatalogueSearchResult, ShopDetailsWithAssets } from "@types";
import { QuestionIcon } from "@primer/octicons-react";
import { buildGameDetailsPath, getSteamLanguage } from "@renderer/helpers";
import { useTranslation } from "react-i18next";
import "./top-sellers.scss";

// Mapeamento de gêneros Steam por tab (valores en pois o catálogo usa inglês internamente)
const TAB_GENRES: Record<string, string[]> = {};

const TABS = [
  { key: "popular", label: "Mais Populares" },
  { key: "new", label: "Lançamentos" },
];

interface TopSellersProps {
  games: CatalogueSearchResult[];
  isLoading?: boolean;
}

function GameRow({
  game,
  rank,
  isActive,
  onHover,
}: Readonly<{
  game: CatalogueSearchResult;
  rank: number;
  isActive: boolean;
  onHover: () => void;
}>) {
  const navigate = useNavigate();
  const genres = game.genres?.slice(0, 3).join(", ") ?? "";

  return (
    <button
      type="button"
      className={`top-sellers__row${isActive ? " top-sellers__row--active" : ""}`}
      onClick={() => navigate(buildGameDetailsPath(game))}
      onMouseEnter={onHover}
      aria-label={game.title}
    >
      <span className="top-sellers__rank">{rank}</span>
      <div className="top-sellers__thumb">
        {game.libraryImageUrl ? (
          <img src={game.libraryImageUrl} alt={game.title} loading="lazy" />
        ) : (
          <QuestionIcon size={20} />
        )}
      </div>
      <div className="top-sellers__meta">
        <span className="top-sellers__name">{game.title}</span>
        <span className="top-sellers__genres">{genres}</span>
      </div>
    </button>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.replace(/\./g, "").split(/[\s/]+/);
  if (parts.length < 3) return dateStr;

  const months: Record<string, string> = {
    jan: "Jan.",
    feb: "Fev.",
    mar: "Mar.",
    apr: "Abr.",
    may: "Mai.",
    jun: "Jun.",
    jul: "Jul.",
    aug: "Ago.",
    sep: "Set.",
    oct: "Out.",
    nov: "Nov.",
    dec: "Dez.",
    janeiro: "Jan.",
    fevereiro: "Fev.",
    março: "Mar.",
    abril: "Abr.",
    maio: "Mai.",
    junho: "Jun.",
    julho: "Jul.",
    agosto: "Ago.",
    setembro: "Set.",
    outubro: "Out.",
    novembro: "Nov.",
    dezembro: "Dez.",
  };

  const monthWord = parts.find((p) => isNaN(Number(p)))?.toLowerCase();
  const year = parts.find((p) => p.length === 4 && !isNaN(Number(p)));

  if (monthWord && year) {
    const month =
      months[monthWord] ||
      monthWord.charAt(0).toUpperCase() + monthWord.slice(1);
    return `${month} ${year}`;
  }

  return dateStr;
}

const detailsCache = new Map<string, ShopDetailsWithAssets>();

// Parseia formatos de data Steam: "21 Nov, 2023", "Nov 21, 2023", "Q4 2023", etc.
const parseReleaseDate = (dateStr: string | undefined): number => {
  if (!dateStr) return 0;
  // Normaliza "21 Nov, 2023" → "Nov 21, 2023"
  const normalized = dateStr.replace(
    /^(\d{1,2})\s+([A-Za-z]+),?\s*(\d{4})$/,
    "$2 $1, $3"
  );
  const ts = new Date(normalized).getTime();
  return isNaN(ts) ? 0 : ts;
};

export function TopSellers({
  games,
  isLoading = false,
}: Readonly<TopSellersProps>) {
  const [activeTab, setActiveTab] = useState("popular");
  const [hoveredIndex, setHoveredIndex] = useState(0);
  const [activeGameDetails, setActiveGameDetails] =
    useState<ShopDetailsWithAssets | null>(null);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [isHoveringPanel, setIsHoveringPanel] = useState(false);
  const [releaseTimestamps, setReleaseTimestamps] = useState<
    Record<string, number>
  >({});
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortFetchRef = useRef<AbortController | null>(null);
  const { i18n } = useTranslation("catalogue");
  const navigate = useNavigate();

  const tabGames = useMemo(() => {
    if (!games.length) return [];

    if (activeTab === "popular") {
      return [...games]
        .sort(
          (a, b) =>
            (b.downloadSources?.length ?? 0) - (a.downloadSources?.length ?? 0)
        )
        .slice(0, 10);
    }

    if (activeTab === "new") {
      return [...games]
        .sort((a, b) => {
          const tsA = releaseTimestamps[a.objectId];
          const tsB = releaseTimestamps[b.objectId];
          // Ambos com data real: mais recente primeiro
          if (tsA && tsB) return tsB - tsA;
          // Só um tem data: o que tem data fica na frente
          if (tsA) return -1;
          if (tsB) return 1;
          // Nenhum tem data ainda: AppID como proxy (maior = mais recente no Steam)
          return parseInt(b.objectId) - parseInt(a.objectId);
        })
        .slice(0, 10);
    }

    const targetGenres = TAB_GENRES[activeTab] ?? [];
    const filtered = games.filter((g) =>
      g.genres?.some((genre) =>
        targetGenres.some(
          (t) =>
            genre.toLowerCase().includes(t.toLowerCase()) ||
            t.toLowerCase().includes(genre.toLowerCase())
        )
      )
    );

    // Fallback: se não há jogos suficientes do gênero, completa com os mais populares
    if (filtered.length < 5) {
      const fallback = [...games]
        .sort(
          (a, b) =>
            (b.downloadSources?.length ?? 0) - (a.downloadSources?.length ?? 0)
        )
        .filter((g) => !filtered.find((f) => f.objectId === g.objectId));
      return [...filtered, ...fallback].slice(0, 10);
    }

    return filtered
      .sort(
        (a, b) =>
          (b.downloadSources?.length ?? 0) - (a.downloadSources?.length ?? 0)
      )
      .slice(0, 10);
  }, [games, activeTab, releaseTimestamps]);

  // Pré-busca datas de lançamento em lotes de 5 quando a aba "Lançamentos" está ativa
  useEffect(() => {
    if (activeTab !== "new" || !games.length) return;

    abortFetchRef.current?.abort();
    const abort = new AbortController();
    abortFetchRef.current = abort;

    const fetchBatch = async (batch: CatalogueSearchResult[]) => {
      await Promise.all(
        batch.map(async (game) => {
          if (abort.signal.aborted) return;
          const cached = detailsCache.get(game.objectId);
          const source = cached
            ? cached
            : await window.electron
                .getGameShopDetails(
                  game.objectId,
                  game.shop,
                  getSteamLanguage(i18n.language)
                )
                .catch(() => null);
          if (source && !abort.signal.aborted) {
            detailsCache.set(game.objectId, source);
            const ts = parseReleaseDate(source.release_date?.date);
            if (ts > 0) {
              setReleaseTimestamps((prev) => ({
                ...prev,
                [game.objectId]: ts,
              }));
            }
          }
        })
      );
    };

    const run = async () => {
      const BATCH = 5;
      for (let i = 0; i < games.length; i += BATCH) {
        if (abort.signal.aborted) break;
        await fetchBatch(games.slice(i, i + BATCH));
      }
    };

    run();
    return () => abort.abort();
  }, [activeTab, games, i18n.language]);

  const activeGame = tabGames[hoveredIndex] ?? tabGames[0];

  const mediaItems = useMemo(() => {
    const items: { thumb: string; full: string }[] = [];
    if (activeGame?.libraryImageUrl) {
      items.push({
        thumb: activeGame.libraryImageUrl,
        full: activeGame.libraryImageUrl,
      });
    }
    if (activeGameDetails?.screenshots) {
      activeGameDetails.screenshots.slice(0, 3).forEach((s) => {
        items.push({ thumb: s.path_thumbnail, full: s.path_full });
      });
    }
    return items;
  }, [activeGame, activeGameDetails]);

  const activeMedia = mediaItems[selectedMediaIndex] ?? mediaItems[0];

  useEffect(() => {
    setSelectedMediaIndex(0);
    setActiveGameDetails(null);
    if (!activeGame) return;

    const key = activeGame.objectId;
    const cached = detailsCache.get(key);
    if (cached) {
      setActiveGameDetails(cached);
      return;
    }

    const timer = setTimeout(() => {
      window.electron
        .getGameShopDetails(
          key,
          activeGame.shop,
          getSteamLanguage(i18n.language)
        )
        .then((result) => {
          if (result) {
            detailsCache.set(key, result);
            if (activeGame.objectId === key) setActiveGameDetails(result);
          }
        })
        .catch(() => {});
    }, 300);

    return () => clearTimeout(timer);
  }, [activeGame, i18n.language]);

  // Autoplay: avança a imagem a cada 3s, pausa no hover
  useEffect(() => {
    if (mediaItems.length <= 1) return;
    if (isHoveringPanel) {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
      return;
    }
    autoplayRef.current = setInterval(() => {
      setSelectedMediaIndex((prev) => (prev + 1) % mediaItems.length);
    }, 3000);
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [mediaItems.length, isHoveringPanel]);

  if (!isLoading && !games.length) return null;

  return (
    <section className="top-sellers">
      <div className="top-sellers__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`top-sellers__tab${activeTab === tab.key ? " top-sellers__tab--active" : ""}`}
            onClick={() => {
              setActiveTab(tab.key);
              setHoveredIndex(0);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="top-sellers__body">
        <div className="top-sellers__list">
          {isLoading
            ? Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="top-sellers__row top-sellers__row--skeleton"
                >
                  <div className="top-sellers__skeleton-thumb" />
                  <div className="top-sellers__skeleton-meta">
                    <div className="top-sellers__skeleton-line" />
                    <div className="top-sellers__skeleton-line top-sellers__skeleton-line--short" />
                  </div>
                </div>
              ))
            : tabGames.map((game, i) => (
                <GameRow
                  key={game.id ?? game.objectId}
                  game={game}
                  rank={i + 1}
                  isActive={i === hoveredIndex}
                  onHover={() => setHoveredIndex(i)}
                />
              ))}
        </div>

        {activeGame && !isLoading && (
          <div
            className="top-sellers__panel"
            onMouseEnter={() => setIsHoveringPanel(true)}
            onMouseLeave={() => setIsHoveringPanel(false)}
          >
            <button
              type="button"
              className="top-sellers__detail"
              onClick={() => navigate(buildGameDetailsPath(activeGame))}
              aria-label={`Ver detalhes de ${activeGame.title}`}
            >
              <div className="top-sellers__detail-header">
                {activeGame.title}
              </div>

              <div className="top-sellers__detail-body">
                <div className="top-sellers__cover-section">
                  <div className="top-sellers__detail-cover">
                    {activeMedia ? (
                      <img
                        src={activeMedia.full}
                        alt={activeGame.title}
                        loading="lazy"
                      />
                    ) : (
                      <div className="top-sellers__detail-placeholder">
                        <QuestionIcon size={40} />
                      </div>
                    )}
                  </div>

                  {mediaItems.length > 1 && (
                    <div className="top-sellers__media-previews">
                      {mediaItems.slice(0, 4).map((m, i) => (
                        <button
                          key={m.thumb}
                          type="button"
                          className={`top-sellers__media-preview${i === selectedMediaIndex ? " top-sellers__media-preview--active" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMediaIndex(i);
                          }}
                        >
                          <img src={m.thumb} alt="Preview" loading="lazy" />
                          {i === selectedMediaIndex && (
                            <span
                              className="top-sellers__media-progress"
                              key={`${activeGame.objectId}-${i}`}
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {activeGame.genres?.length > 0 && (
                    <div className="top-sellers__detail-tags">
                      {activeGame.genres.slice(0, 4).map((g) => (
                        <span key={g} className="top-sellers__detail-tag">
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="top-sellers__detail-info">
                  {activeGameDetails?.short_description && (
                    <div className="top-sellers__detail-description">
                      {activeGameDetails.short_description}
                    </div>
                  )}

                  <div className="top-sellers__detail-grid">
                    {(activeGameDetails as any)?.developers?.length > 0 && (
                      <div className="top-sellers__detail-block">
                        <span className="top-sellers__detail-label">
                          Desenvolvedor:
                        </span>
                        <span className="top-sellers__detail-value">
                          {(activeGameDetails as any).developers[0]}
                        </span>
                      </div>
                    )}

                    {(activeGameDetails as any)?.publishers?.length > 0 && (
                      <div className="top-sellers__detail-block">
                        <span className="top-sellers__detail-label">
                          Distribuidora:
                        </span>
                        <span className="top-sellers__detail-value">
                          {(activeGameDetails as any).publishers[0]}
                        </span>
                      </div>
                    )}

                    {activeGameDetails?.release_date?.date && (
                      <div className="top-sellers__detail-block">
                        <span className="top-sellers__detail-label">
                          Lançamento:
                        </span>
                        <span className="top-sellers__detail-value">
                          {formatDate(activeGameDetails.release_date.date)}
                        </span>
                      </div>
                    )}

                    {(activeGameDetails as any)?.metacritic?.score && (
                      <div className="top-sellers__detail-block">
                        <span className="top-sellers__detail-label">
                          Metacritic:
                        </span>
                        <span
                          className="top-sellers__detail-value"
                          style={{ color: "#2ecc71" }}
                        >
                          {(activeGameDetails as any).metacritic.score}
                        </span>
                      </div>
                    )}
                  </div>

                  <div
                    className="top-sellers__detail-block"
                    style={{ marginTop: "16px" }}
                  >
                    <span className="top-sellers__detail-label">
                      Fontes:
                    </span>
                    <div className="top-sellers__detail-sources">
                      {activeGame.downloadSources?.map((source) => (
                        <span
                          key={source}
                          className="top-sellers__detail-source-badge"
                        >
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
