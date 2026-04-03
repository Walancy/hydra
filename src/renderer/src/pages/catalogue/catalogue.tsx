import type {
  CatalogueSearchResult,
  CatalogueSearchPayload,
  DownloadSource,
} from "@types";

import { useAppDispatch, useAppSelector, useFormat } from "@renderer/hooks";
import { useLibrary } from "@renderer/hooks/use-library";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "./catalogue.scss";

import { FilterSection } from "./filter-section";
import { setFilters, setPage } from "@renderer/features";
import { useTranslation } from "react-i18next";
import { Pagination } from "./pagination";
import { useCatalogue } from "@renderer/hooks/use-catalogue";
import { FilterItem } from "./filter-item";
import { debounce } from "lodash-es";
import { Button } from "@renderer/components/button/button";
import {
  TagIcon,
  DownloadIcon,
  PeopleIcon,
  BriefcaseIcon,
  ProjectIcon,
  DeviceDesktopIcon,
  SearchIcon,
} from "@primer/octicons-react";
import { FeaturedCarousel } from "./featured-carousel";
import { CatalogueSection } from "./catalogue-section";
import { CategoryExplorer } from "./category-explorer";
import { TopSellers } from "./top-sellers";
import { expandAcronym } from "@renderer/services/game-acronyms";
import { useGamepadConnected } from "@renderer/hooks/use-gamepad";

const ProtonCompatibilitySection = lazy(async () => {
  const mod = await import("./proton-compatibility-section");
  return { default: mod.ProtonCompatibilitySection };
});

type CompatibilityThreshold<Value extends string> = {
  value: string;
  labelKey: string;
  values: Value[];
  color?: string;
};

const clearAllCategoryFilters = {
  genres: [],
  tags: [],
  downloadSourceFingerprints: [],
  developers: [],
  publishers: [],
  protondbSupportBadges: [],
  deckCompatibility: [],
};

const protonCompatibilityThresholds: CompatibilityThreshold<
  CatalogueSearchPayload["protondbSupportBadges"][number]
>[] = [
  {
    value: "silver_plus",
    labelKey: "protondb_silver_plus",
    values: ["silver", "gold", "platinum"],
    color: "rgb(166,166,166)",
  },
  {
    value: "gold_plus",
    labelKey: "protondb_gold_plus",
    values: ["gold", "platinum"],
    color: "rgb(207,181,59)",
  },
  {
    value: "platinum_only",
    labelKey: "protondb_platinum_only",
    values: ["platinum"],
    color: "rgb(180,199,220)",
  },
];

const areSameValues = (a: string[], b: string[]) =>
  a.length === b.length && a.every((i) => b.includes(i));

const SECTION_SIZE_DEFAULT = 10;
const SECTION_SIZE_GAMEPAD = 20;

let globalCachedResults: CatalogueSearchResult[] | null = null;
let globalCachedCount: number = 0;
let globalCachedPage: number = 1;
let globalCachedKey: string = "";

const getCachedResults = () => {
  if (globalCachedResults) return globalCachedResults;
  if ((window as any).__HYDRA_CATALOGUE_CACHE__) {
    const cache = (window as any).__HYDRA_CATALOGUE_CACHE__;
    globalCachedResults = cache.results;
    globalCachedCount = cache.count;
    globalCachedPage = cache.page;
    globalCachedKey = cache.key;
  }
  return globalCachedResults;
};

export default function Catalogue() {
  const abortControllerRef = useRef<AbortController | null>(null);
  const cataloguePageRef = useRef<HTMLDivElement>(null);

  const { steamDevelopers, steamPublishers, downloadSources } = useCatalogue();
  const { library } = useLibrary();
  const { steamGenres, steamUserTags, filters, page } = useAppSelector(
    (state) => state.catalogueSearch
  );

  // Local input state decoupled from Redux to avoid dispatching on every keystroke
  const [localTitle, setLocalTitle] = useState(filters.title ?? "");

  const [isLoading, setIsLoading] = useState(
    getCachedResults() === null || globalCachedPage !== page
  );
  const [results, setResults] = useState<CatalogueSearchResult[]>(
    globalCachedPage === page ? getCachedResults() || [] : []
  );
  const [itemsCount, setItemsCount] = useState(
    globalCachedPage === page ? globalCachedCount : 0
  );
  const [pageSize] = useState(60);
  const { formatNumber } = useFormat();
  const dispatch = useAppDispatch();
  const { t, i18n } = useTranslation("catalogue");
  const shouldShowProtonFeatures = window.electron.platform === "linux";

  const hasActiveFilters = useMemo(
    () =>
      filters.genres.length > 0 ||
      filters.tags.length > 0 ||
      filters.downloadSourceFingerprints.length > 0 ||
      filters.developers.length > 0 ||
      filters.publishers.length > 0 ||
      filters.protondbSupportBadges.length > 0 ||
      filters.deckCompatibility.length > 0 ||
      (filters.title?.trim().length ?? 0) > 0,
    [filters]
  );

  // Debounce the title dispatch so Redux (and the API) only updates after user stops typing
  const debouncedTitleDispatch = useRef(
    debounce((value: string) => {
      dispatch(setFilters({ title: value }));
    }, 500)
  ).current;

  const handleTitleChange = useCallback(
    (value: string) => {
      setLocalTitle(value);
      debouncedTitleDispatch(value);
    },
    [debouncedTitleDispatch]
  );

  // Sync localTitle if filters.title is cleared externally (e.g. "Limpar Filtros")
  useEffect(() => {
    if (!filters.title) setLocalTitle("");
  }, [filters.title]);

  const debouncedSearch = useRef(
    debounce(
      async (
        filtersArg: CatalogueSearchPayload,
        sources: DownloadSource[],
        take: number,
        offset: number
      ) => {
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        const expandedTitle = expandAcronym(filtersArg.title || "");
        const resolvedFilters = expandedTitle
          ? { ...filtersArg, title: expandedTitle }
          : filtersArg;

        const response = await window.electron.hydraApi.post<{
          edges: CatalogueSearchResult[];
          count: number;
        }>("/catalogue/search", {
          data: {
            ...resolvedFilters,
            take,
            skip: offset,
            downloadSourceIds: sources.map((s) => s.id),
          },
          needsAuth: false,
        });

        if (abortController.signal.aborted) return;

        setResults(response.edges);
        setItemsCount(response.count);

        globalCachedResults = response.edges;
        globalCachedCount = response.count;
        globalCachedPage = page;
        globalCachedKey = JSON.stringify({ filtersArg, sources, take, offset });

        setIsLoading(false);
      },
      500,
      { leading: false, trailing: true }
    )
  ).current;

  const decodeHTML = (s: string) =>
    s.replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">");

  useEffect(() => {
    const key = JSON.stringify({
      filtersArg: filters,
      sources: downloadSources,
      take: pageSize,
      offset: (page - 1) * pageSize,
    });
    if (globalCachedKey === key && globalCachedResults !== null) {
      // Re-mounting with exactly the same parameters, no need to fetch or show loading skeleton!
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setAllGamesTitle(null);
    if (hasActiveFilters) setShowAll(false);
    abortControllerRef.current?.abort();
    debouncedSearch(filters, downloadSources, pageSize, (page - 1) * pageSize);
    return () => {
      debouncedSearch.cancel();
    };
  }, [filters, downloadSources, page, pageSize, debouncedSearch]);

  const language = i18n.language.split("-")[0];

  const steamGenresMapping = useMemo<Record<string, string>>(() => {
    if (!steamGenres[language]) return {};
    return steamGenres[language].reduce(
      (acc, genre, i) => {
        acc[genre] = steamGenres["en"][i];
        return acc;
      },
      {} as Record<string, string>
    );
  }, [steamGenres, language]);

  const steamGenresFilterItems = useMemo(
    () =>
      Object.entries(steamGenresMapping)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => ({
          label: key,
          value,
          checked: filters.genres.includes(value),
        })),
    [steamGenresMapping, filters.genres]
  );

  const steamUserTagsFilterItems = useMemo(() => {
    if (!steamUserTags[language]) return [];
    return Object.entries(steamUserTags[language])
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({
        label: key,
        value,
        checked: filters.tags.includes(value),
      }));
  }, [steamUserTags, filters.tags, language]);

  const groupedFilters = useMemo(() => {
    const protonThreshold = protonCompatibilityThresholds.find((t) =>
      areSameValues(t.values, filters.protondbSupportBadges)
    );
    const deckCompatible = areSameValues(filters.deckCompatibility, [
      "playable",
      "verified",
    ]);

    return [
      ...filters.genres.map((genre) => ({
        label: Object.keys(steamGenresMapping).find(
          (k) => steamGenresMapping[k] === genre
        ) as string,
        filterType: t("genres"),
        icon: <ProjectIcon size={14} />,
        key: "genres",
        value: genre,
      })),
      ...filters.tags.map((tag) => ({
        label: Object.keys(steamUserTags[language] ?? {}).find(
          (k) => steamUserTags[language][k] === tag
        ),
        filterType: t("tags"),
        icon: <TagIcon size={14} />,
        key: "tags",
        value: tag,
      })),
      ...filters.downloadSourceFingerprints.map((fp) => ({
        label: downloadSources.find((s) => s.fingerprint === fp)
          ?.name as string,
        filterType: t("download_sources"),
        icon: <DownloadIcon size={14} />,
        key: "downloadSourceFingerprints",
        value: fp,
      })),
      ...filters.developers.map((dev) => ({
        label: dev,
        filterType: t("developers"),
        icon: <PeopleIcon size={14} />,
        key: "developers",
        value: dev,
      })),
      ...filters.publishers.map((pub) => ({
        label: decodeHTML(pub),
        filterType: t("publishers"),
        icon: <BriefcaseIcon size={14} />,
        key: "publishers",
        value: pub,
      })),
      ...(shouldShowProtonFeatures && protonThreshold?.values.length
        ? [
            {
              label: t(protonThreshold.labelKey),
              filterType: t("protondb"),
              icon: <DeviceDesktopIcon size={14} />,
              key: "protondbSupportBadges",
              value: "threshold",
            },
          ]
        : []),
      ...(shouldShowProtonFeatures && deckCompatible
        ? [
            {
              label: t("steam_deck_compatible"),
              filterType: t("steam_deck_minimum"),
              icon: <DeviceDesktopIcon size={14} />,
              key: "deckCompatibility",
              value: "threshold",
            },
          ]
        : []),
    ];
  }, [
    filters,
    steamUserTags,
    downloadSources,
    steamGenresMapping,
    language,
    shouldShowProtonFeatures,
    t,
  ]);

  const filterSections = useMemo(
    () => [
      {
        title: t("genres"),
        items: steamGenresFilterItems,
        key: "genres",
        icon: <ProjectIcon size={16} />,
      },
      {
        title: t("tags"),
        items: steamUserTagsFilterItems,
        key: "tags",
        icon: <TagIcon size={16} />,
      },
      {
        title: t("download_sources"),
        items: downloadSources
          .filter((s) => s.fingerprint)
          .map((s) => ({
            label: s.name,
            value: s.fingerprint!,
            checked: filters.downloadSourceFingerprints.includes(
              s.fingerprint!
            ),
          })),
        key: "downloadSourceFingerprints",
        icon: <DownloadIcon size={16} />,
      },
      {
        title: t("developers"),
        items: steamDevelopers.map((d) => ({
          label: d,
          value: d,
          checked: filters.developers.includes(d),
        })),
        key: "developers",
        icon: <PeopleIcon size={16} />,
      },
      {
        title: t("publishers"),
        items: steamPublishers.map((p) => ({
          label: decodeHTML(p),
          value: p,
          checked: filters.publishers.includes(p),
        })),
        key: "publishers",
        icon: <BriefcaseIcon size={16} />,
      },
    ],
    [
      downloadSources,
      filters,
      steamDevelopers,
      steamGenresFilterItems,
      steamPublishers,
      steamUserTagsFilterItems,
      t,
    ]
  );

  const protonThresholdValue =
    protonCompatibilityThresholds.find((t) =>
      areSameValues(t.values, filters.protondbSupportBadges)
    )?.value ?? "";
  const isDeckCompatible = areSameValues(filters.deckCompatibility, [
    "playable",
    "verified",
  ]);
  const selectedFiltersCount = groupedFilters.length;

  const handleFilterSelect = useCallback(
    (key: string, value: string) => {
      const current = filters[key as keyof typeof filters] as string[];
      dispatch(
        setFilters({
          [key]: current.includes(value)
            ? current.filter((i) => i !== value)
            : [...current, value],
        })
      );
    },
    [filters, dispatch]
  );

  const handleGenreClick = useCallback(
    (genre: string) => {
      const enKey = steamGenresMapping[genre];
      if (enKey) dispatch(setFilters({ genres: [enKey] }));
    },
    [steamGenresMapping, dispatch]
  );

  // Seeded daily shuffle — mesmo resultado para o dia, muda à meia-noite
  const dailyShuffled = useMemo(() => {
    if (!results.length) return [];
    const today = new Date();
    let seed =
      today.getFullYear() * 10000 +
      (today.getMonth() + 1) * 100 +
      today.getDate();
    const copy = [...results];
    for (let i = copy.length - 1; i > 0; i--) {
      seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
      const j = seed % (i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }, [results]);

  const isGamepadConnected = useGamepadConnected();
  const sectionSize = isGamepadConnected
    ? SECTION_SIZE_GAMEPAD
    : SECTION_SIZE_DEFAULT;

  // Home sections from results pool
  const sections = useMemo(() => {
    if (hasActiveFilters || !results.length) return [];

    const used = new Set<string>();

    // Destaques do Dia — embaralhado com seed diária
    const destaques = dailyShuffled.slice(0, sectionSize);
    destaques.forEach((g) => used.add(g.objectId));

    // Mais Populares — jogos com mais fontes de download disponíveis
    const populares = [...results]
      .filter((g) => !used.has(g.objectId))
      .sort(
        (a, b) =>
          (b.downloadSources?.length ?? 0) - (a.downloadSources?.length ?? 0)
      )
      .slice(0, sectionSize);
    populares.forEach((g) => used.add(g.objectId));

    // Recomendados para Você — pontuados por overlap de gêneros com a biblioteca
    const libraryIds = new Set(library.map((g) => g.objectId));
    const genreFreq: Record<string, number> = {};
    results
      .filter((g) => libraryIds.has(g.objectId))
      .flatMap((g) => g.genres)
      .forEach((genre) => {
        genreFreq[genre] = (genreFreq[genre] ?? 0) + 1;
      });
    const hasGenreProfile = Object.keys(genreFreq).length > 0;

    const recomendados = [...results]
      .filter((g) => !used.has(g.objectId) && !libraryIds.has(g.objectId))
      .map((g) => ({
        game: g,
        score: hasGenreProfile
          ? g.genres.reduce((acc, genre) => acc + (genreFreq[genre] ?? 0), 0)
          : 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, sectionSize)
      .map(({ game }) => game);

    return [
      { title: "Destaques do Dia", games: destaques },
      { title: "Mais Populares", games: populares },
      { title: "Recomendados para Você", games: recomendados },
    ].filter((s) => s.games.length > 0);
  }, [results, hasActiveFilters, dailyShuffled, library, sectionSize]);

  const [showFilters, setShowFilters] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [allGamesTitle, setAllGamesTitle] = useState<string | null>(null);
  const featuredGames = useMemo(() => results.slice(0, 9), [results]);

  return (
    <div className="catalogue" ref={cataloguePageRef}>
      {/* Sticky filter bar centered */}
      <div className="catalogue__filter-bar" data-gamepad-autofocus-skip="true">
        <div
          className={`catalogue__filter-bar-inner ${!showFilters ? "catalogue__filter-bar-inner--closed" : ""}`}
        >
          <div className="catalogue__filter-bar-search">
            <div
              className="header__search-bar header__search-bar--inline"
              style={{ width: "100%", padding: "8px 16px", minWidth: "unset" }}
            >
              <SearchIcon size={16} className="header__search-bar-icon" />
              <input
                type="text"
                className="header__search-input"
                placeholder={t("search", {
                  ns: "header",
                  defaultValue: "Buscar...",
                })}
                value={localTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
              />
            </div>
          </div>
          <div
            className={`catalogue__filter-bar-options ${showFilters ? "catalogue__filter-bar-options--open" : ""}`}
            data-gamepad-ignore="true"
          >
            {shouldShowProtonFeatures && (
              <Suspense fallback={null}>
                <ProtonCompatibilitySection
                  title={t("protondb")}
                  protonSliderLabel={t("protondb_minimum")}
                  deckSliderLabel={t("steam_deck_minimum")}
                  protonOptions={protonCompatibilityThresholds.map((th) => ({
                    value: th.value,
                    label: t(th.labelKey),
                    color: th.color,
                  }))}
                  protonValue={protonThresholdValue}
                  deckChecked={isDeckCompatible}
                  deckLabel={t("steam_deck_compatible")}
                  icon={<DeviceDesktopIcon size={16} />}
                  onProtonChange={(value) => {
                    const nextTh = protonCompatibilityThresholds.find(
                      (th) => th.value === value
                    );
                    dispatch(
                      setFilters({
                        protondbSupportBadges: nextTh ? [...nextTh.values] : [],
                      })
                    );
                  }}
                  onDeckChange={(checked) =>
                    dispatch(
                      setFilters({
                        deckCompatibility: checked
                          ? ["playable", "verified"]
                          : [],
                      })
                    )
                  }
                />
              </Suspense>
            )}
            {filterSections.map((section) => (
              <FilterSection
                key={section.key}
                title={section.title}
                onClear={() => dispatch(setFilters({ [section.key]: [] }))}
                icon={section.icon}
                onSelect={(value) =>
                  handleFilterSelect(section.key, value as string)
                }
                items={section.items}
              />
            ))}
          </div>
          <div className="catalogue__filter-bar-toggles">
            <Button
              theme={showAll ? "primary" : "outline"}
              onClick={() => {
                setShowAll((prev) => !prev);
                setAllGamesTitle(null);
                if (cataloguePageRef.current)
                  cataloguePageRef.current.scrollTop = 0;
              }}
            >
              {t("ver_tudo", { defaultValue: "Ver Tudo" })}
            </Button>
            <Button
              theme="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <ProjectIcon size={14} />{" "}
              {t("filters", { defaultValue: "Filtros" })}
            </Button>
          </div>
        </div>
      </div>

      {/* Active filter tags */}
      {selectedFiltersCount > 0 && (
        <div className="catalogue__active-filters" data-gamepad-ignore="true">
          <ul className="catalogue__filters-list">
            {groupedFilters.map((filter) => (
              <li key={`${filter.key}-${filter.value}`}>
                <FilterItem
                  filter={filter.label ?? ""}
                  filterType={filter.filterType}
                  icon={filter.icon}
                  onRemove={() => {
                    if (filter.value === "threshold") {
                      dispatch(setFilters({ [filter.key]: [] }));
                      return;
                    }
                    dispatch(
                      setFilters({
                        [filter.key]: (
                          filters[
                            filter.key as keyof typeof filters
                          ] as string[]
                        ).filter((i) => i !== filter.value),
                      })
                    );
                  }}
                />
              </li>
            ))}
          </ul>
          <Button
            type="button"
            theme="outline"
            className="catalogue__clear-btn"
            onClick={() => dispatch(setFilters(clearAllCategoryFilters))}
          >
            {t("clear_filters_button", { defaultValue: "Limpar Filtros" })}
          </Button>
        </div>
      )}

      <div className="catalogue__content">
        {/* Home layout */}
        {!hasActiveFilters && !allGamesTitle && !showAll && (
          <>
            <FeaturedCarousel games={isLoading ? [] : featuredGames} />
            {sections.map((s) => (
              <CatalogueSection
                key={s.title}
                title={s.title}
                games={s.games}
                isLoading={isLoading}
                onVerMais={() => {
                  setAllGamesTitle(s.title);
                  if (cataloguePageRef.current)
                    cataloguePageRef.current.scrollTop = 0;
                }}
              />
            ))}
            {isLoading && (
              <>
                <CatalogueSection
                  title="Destaques do Dia"
                  games={[]}
                  isLoading
                  skeletonCount={sectionSize}
                />
                <CatalogueSection
                  title="Mais Populares"
                  games={[]}
                  isLoading
                  skeletonCount={sectionSize}
                />
              </>
            )}
            {!isGamepadConnected && (
              <>
                <CategoryExplorer onSelectGenre={handleGenreClick} />
                <TopSellers games={results} isLoading={isLoading} />
              </>
            )}
          </>
        )}

        {/* Ver Tudo — full catalogue list with pagination */}
        {!hasActiveFilters && showAll && (
          <>
            <CatalogueSection
              title={`${formatNumber(itemsCount)} ${t("results", { defaultValue: "jogos" })}`}
              games={results}
              isLoading={isLoading}
            />
            <div className="catalogue__pagination-container">
              <Pagination
                page={page}
                totalPages={Math.ceil(itemsCount / pageSize)}
                onPageChange={(p) => {
                  dispatch(setPage(p));
                  if (cataloguePageRef.current)
                    cataloguePageRef.current.scrollTop = 0;
                }}
              />
            </div>
          </>
        )}

        {/* Ver Mais — full catalogue list */}
        {!hasActiveFilters && !showAll && allGamesTitle && (
          <>
            <div className="catalogue__ver-mais-header">
              <button
                type="button"
                className="catalogue__ver-mais-back"
                onClick={() => {
                  setAllGamesTitle(null);
                  if (cataloguePageRef.current)
                    cataloguePageRef.current.scrollTop = 0;
                }}
              >
                ← Voltar
              </button>
              <span className="catalogue__ver-mais-title">{allGamesTitle}</span>
            </div>
            <CatalogueSection title="" games={results} isLoading={isLoading} />
          </>
        )}

        {/* Filter results */}
        {hasActiveFilters && (
          <>
            <CatalogueSection
              title={`${formatNumber(itemsCount)} resultados`}
              games={results}
              isLoading={isLoading}
            />
            <div className="catalogue__pagination-container">
              <Pagination
                page={page}
                totalPages={Math.ceil(itemsCount / pageSize)}
                onPageChange={(p) => {
                  dispatch(setPage(p));
                  if (cataloguePageRef.current)
                    cataloguePageRef.current.scrollTop = 0;
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
