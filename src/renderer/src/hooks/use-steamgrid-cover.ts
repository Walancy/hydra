import { useState, useEffect, useRef } from "react";

const STEAMGRID_API_KEY = "8c53a8c366b96459117a44a68a5d7a60";
const cache = new Map<string, string | null>();

interface GridItem {
  width: number;
  height: number;
  url: string;
}

interface SearchResult {
  id: number;
}

async function fetchGridByObjectId(objectId: string): Promise<string | null> {
  const resp = await fetch(
    `https://www.steamgriddb.com/api/v2/grids/steam/${objectId}`,
    { headers: { Authorization: `Bearer ${STEAMGRID_API_KEY}` } }
  );
  const data = await resp.json();
  if (data.success && data.data?.length > 0) {
    const vertical =
      (data.data as GridItem[]).find(
        (g) => g.width === 600 && g.height === 900
      ) ?? (data.data[0] as GridItem);
    return vertical.url;
  }
  return null;
}

async function fetchGridByTitle(title: string): Promise<string | null> {
  const searchResp = await fetch(
    `https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(title)}`,
    { headers: { Authorization: `Bearer ${STEAMGRID_API_KEY}` } }
  );
  const searchData = await searchResp.json();
  if (!searchData.success || !searchData.data?.length) return null;

  const gameId = (searchData.data[0] as SearchResult).id;
  const gridResp = await fetch(
    `https://www.steamgriddb.com/api/v2/grids/game/${gameId}?dimensions=600x900`,
    { headers: { Authorization: `Bearer ${STEAMGRID_API_KEY}` } }
  );
  const gridData = await gridResp.json();
  if (gridData.success && gridData.data?.length > 0) {
    return (gridData.data[0] as GridItem).url;
  }
  return null;
}

export function useSteamGridCover(
  objectId: string,
  title: string,
  primaryFailed: boolean
): string | null {
  const [gridUrl, setGridUrl] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!primaryFailed || fetchedRef.current) return;

    const cacheKey = `sgdb:${objectId}`;
    if (cache.has(cacheKey)) {
      setGridUrl(cache.get(cacheKey) ?? null);
      return;
    }

    fetchedRef.current = true;

    const run = async () => {
      try {
        let url = await fetchGridByObjectId(objectId);
        if (!url) url = await fetchGridByTitle(title);
        cache.set(cacheKey, url);
        setGridUrl(url);
      } catch {
        cache.set(cacheKey, null);
      }
    };

    run();
  }, [primaryFailed, objectId, title]);

  return gridUrl;
}
