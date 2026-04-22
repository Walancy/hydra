import { registerEvent } from "../register-event";
import axios from "axios";
import type { ShopAssets } from "@types";

const getSteamFeaturedEvent = async (
  _event: Electron.IpcMainInvokeEvent,
  language: string
) => {
  try {
    const response = await axios.get(
      `https://store.steampowered.com/api/featuredcategories/?cc=BR&l=${language}`
    );
    const data = response.data;
    const games: ShopAssets[] = [];

    const addGames = (steamGames: any[]) => {
      if (!steamGames || !Array.isArray(steamGames)) return;
      for (const game of steamGames) {
        // Only allow Apps (type: 0). Bundles, subs, etc. break the image CDN formatting.
        if (game.type !== 0 && game.type !== undefined) continue;

        const gameId = game.id || game.appid || game.item_id;
        if (!gameId) continue;

        const gameIdStr = gameId.toString();

        if (!games.find((g) => g.objectId === gameIdStr)) {
          games.push({
            objectId: gameIdStr,
            title: game.name || game.title,
            shop: "steam",
            // Use store item assets instead of akamaihd when possible, which is more reliable.
            coverImageUrl: game.large_capsule_image || game.header_image,
            libraryImageUrl: `https://shared.steamstatic.com/store_item_assets/steam/apps/${gameIdStr}/library_600x900.jpg`,
            libraryHeroImageUrl: `https://shared.steamstatic.com/store_item_assets/steam/apps/${gameIdStr}/library_hero.jpg`,
            logoImageUrl: `https://shared.steamstatic.com/store_item_assets/steam/apps/${gameIdStr}/logo.png`,
            iconUrl: null,
            logoPosition: null,
            downloadSources: [],
          });
        }
      }
    };

    // A Steam Store destaca esses nas categorias principais
    addGames(data.top_sellers?.items);
    addGames(data.specials?.items);

    return games;
  } catch (error) {
    return [];
  }
};

registerEvent("getSteamFeatured", getSteamFeaturedEvent);
