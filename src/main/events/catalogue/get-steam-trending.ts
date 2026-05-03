import { registerEvent } from "../register-event";
import axios from "axios";
import type { ShopAssets } from "@types";

interface TrendingCache {
  data: {
    topSellers: ShopAssets[];
    newReleases: ShopAssets[];
    comingSoon: ShopAssets[];
    specials: ShopAssets[];
  };
  timestamp: number;
}

const cacheMap = new Map<string, TrendingCache>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

const getSteamTrendingEvent = async (
  _event: Electron.IpcMainInvokeEvent,
  language: string
) => {
  try {
    const cached = cacheMap.get(language);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const response = await axios.get(
      `https://store.steampowered.com/api/featuredcategories/?cc=BR&l=${language}`
    );
    const data = response.data;

    const mapGames = (steamGames: any[]): ShopAssets[] => {
      const games: ShopAssets[] = [];
      if (!steamGames || !Array.isArray(steamGames)) return games;
      for (const game of steamGames) {
        if (game.type !== 0 && game.type !== undefined) continue;
        const gameId = game.id || game.appid || game.item_id;
        if (!gameId) continue;
        const gameIdStr = gameId.toString();
        if (!games.find((g) => g.objectId === gameIdStr)) {
          games.push({
            objectId: gameIdStr,
            title: game.name || game.title,
            shop: "steam",
            coverImageUrl: game.large_capsule_image || game.header_image,
            libraryImageUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${gameIdStr}/library_600x900.jpg`,
            libraryHeroImageUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${gameIdStr}/library_hero.jpg`,
            logoImageUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${gameIdStr}/logo.png`,
            iconUrl: null,
            logoPosition: null,
            downloadSources: [],
          });
        }
      }
      return games;
    };

    const fetchSearchCategory = async (
      filter: string
    ): Promise<ShopAssets[]> => {
      try {
        const res = await axios.get(
          `https://store.steampowered.com/search/results/?query&start=0&count=15&dynamic_data=&sort_by=_ASC&snr=1_7_7_7000_7&filter=${filter}&cc=BR&l=${language}&json=1`
        );
        const items = res.data?.items;
        const games: ShopAssets[] = [];
        if (!Array.isArray(items)) return games;

        for (const item of items) {
          if (!item.logo) continue;
          const match = item.logo.match(/apps\/(\d+)\//);
          if (!match) continue;
          const gameIdStr = match[1];

          if (!games.find((g) => g.objectId === gameIdStr)) {
            games.push({
              objectId: gameIdStr,
              title: item.name,
              shop: "steam",
              coverImageUrl:
                item.logo
                  .replace("capsule_sm_120.jpg", "header.jpg")
                  .replace("capsule_sm_120", "header") ||
                `https://cdn.akamai.steamstatic.com/steam/apps/${gameIdStr}/header.jpg`,
              libraryImageUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${gameIdStr}/library_600x900.jpg`,
              libraryHeroImageUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${gameIdStr}/library_hero.jpg`,
              logoImageUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${gameIdStr}/logo.png`,
              iconUrl: null,
              logoPosition: null,
              downloadSources: [],
            });
          }
        }
        return games;
      } catch (err) {
        return [];
      }
    };

    const [popularNew, popularWishlist] = await Promise.all([
      fetchSearchCategory("popularnew"),
      fetchSearchCategory("popularwishlist"),
    ]);

    const result = {
      topSellers: mapGames(data.top_sellers?.items),
      newReleases: popularNew,
      comingSoon: popularWishlist,
      specials: mapGames(data.specials?.items),
    };

    cacheMap.set(language, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    return { topSellers: [], newReleases: [], comingSoon: [], specials: [] };
  }
};

registerEvent("getSteamTrending", getSteamTrendingEvent);
