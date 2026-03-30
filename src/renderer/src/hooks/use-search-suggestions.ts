import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAppSelector } from "./redux";
import { debounce } from "lodash-es";
import { logger } from "@renderer/logger";
import type { GameShop } from "@types";

export interface SearchSuggestion {
  title: string;
  objectId: string;
  shop: GameShop;
  iconUrl: string | null;
  libraryImageUrl?: string | null;
  source: "library" | "catalogue";
}

export function useSearchSuggestions(
  query: string,
  isOnLibraryPage: boolean,
  enabled: boolean = true
) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const library = useAppSelector((state) => state.library.value);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, SearchSuggestion[]>>(new Map());

  const getLibrarySuggestions = useCallback(
    (searchQuery: string, limit: number = 20): SearchSuggestion[] => {
      if (!searchQuery.trim()) return [];

      const queryLower = searchQuery.toLowerCase();
      const matches: SearchSuggestion[] = [];

      for (const game of library) {
        if (matches.length >= limit) break;

        const titleLower = game.title.toLowerCase();
        let queryIndex = 0;

        for (
          let i = 0;
          i < titleLower.length && queryIndex < queryLower.length;
          i++
        ) {
          if (titleLower[i] === queryLower[queryIndex]) {
            queryIndex++;
          }
        }

        if (queryIndex === queryLower.length) {
          matches.push({
            title: game.title,
            objectId: game.objectId,
            shop: game.shop,
            iconUrl: game.iconUrl,
            libraryImageUrl: game.libraryImageUrl,
            source: "library",
          });
        }
      }

      return matches;
    },
    [library]
  );

  const fetchCatalogueSuggestions = useCallback(
    async (searchQuery: string, limit: number = 20) => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      const cacheKey = searchQuery.toLowerCase();
      const cachedResults = cacheRef.current.get(cacheKey);

      if (cachedResults) {
        setSuggestions(cachedResults);
        setIsLoading(false);
        return;
      }

      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsLoading(true);

      try {
        const response = await window.electron.hydraApi.post<{
          edges: import("@types").CatalogueSearchResult[];
          count: number;
        }>("/catalogue/search", {
          data: {
            title: searchQuery,
            take: limit,
            skip: 0,
            genres: [],
            tags: [],
            developers: [],
            publishers: [],
            downloadSourceFingerprints: [],
            protondbSupportBadges: [],
            deckCompatibility: [],
            downloadSourceIds: [],
          },
          needsAuth: false,
        });

        if (abortController.signal.aborted) return;

        const sortedEdges = [...response.edges].sort(
          (a, b) =>
            (b.downloadSources?.length ?? 0) - (a.downloadSources?.length ?? 0) + 
            ((b as any).reviewCount || 0) - ((a as any).reviewCount || 0)
        );

        const catalogueSuggestions: SearchSuggestion[] = sortedEdges.map(
          (item) => ({
            title: item.title,
            objectId: item.objectId,
            shop: item.shop,
            iconUrl: (item as any).iconUrl || null,
            libraryImageUrl: item.libraryImageUrl || null,
            source: "catalogue" as const,
          })
        );

        cacheRef.current.set(cacheKey, catalogueSuggestions);
        setSuggestions(catalogueSuggestions);
      } catch (error) {
        if (!abortController.signal.aborted) {
          setSuggestions([]);
          logger.error("Failed to fetch catalogue suggestions", error);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  const debouncedFetchCatalogue = useMemo(
    () => debounce(fetchCatalogueSuggestions, 300),
    [fetchCatalogueSuggestions]
  );

  useEffect(() => {
    if (!enabled || !query || query.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      abortControllerRef.current?.abort();
      debouncedFetchCatalogue.cancel();
      return;
    }

    if (isOnLibraryPage) {
      const librarySuggestions = getLibrarySuggestions(query, 20);
      setSuggestions(librarySuggestions);
      setIsLoading(false);
    } else {
      debouncedFetchCatalogue(query, 20);
    }

    return () => {
      debouncedFetchCatalogue.cancel();
      abortControllerRef.current?.abort();
    };
  }, [
    query,
    isOnLibraryPage,
    enabled,
    getLibrarySuggestions,
    debouncedFetchCatalogue,
  ]);

  return { suggestions, isLoading };
}
