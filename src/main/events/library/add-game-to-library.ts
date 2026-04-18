import { registerEvent } from "../register-event";
import axios from "axios";
import type { GameShop } from "@types";
import { createGame } from "@main/services/library-sync";
import {
  downloadsSublevel,
  gamesShopAssetsSublevel,
  gamesSublevel,
  levelKeys,
} from "@main/level";
import { AchievementWatcherManager } from "@main/services/achievements/achievement-watcher-manager";

const EPIC_TO_STEAM_APPID_MAP: Record<string, number> = {
  "Grand Theft Auto V": 271590,
  "Grand Theft Auto V Enhanced": 271590,
};
const addGameToLibrary = async (
  _event: Electron.IpcMainInvokeEvent,
  shop: GameShop,
  objectId: string,
  title: string
) => {
  const gameKey = levelKeys.game(shop, objectId);
  let game = await gamesSublevel.get(gameKey).catch(() => undefined);

  let gameAssets = await gamesShopAssetsSublevel.get(gameKey).catch(() => undefined);

  if (!gameAssets && shop !== "custom" && shop !== "epic") {
    const { getGameAssets } = await import("../catalogue/get-game-assets");
    const result = await getGameAssets(objectId, shop);
    if (result) {
      gameAssets = { ...result, updatedAt: Date.now() };
    }
  }

  let iconUrl = gameAssets?.iconUrl ?? null;
  let libraryHeroImageUrl = gameAssets?.libraryHeroImageUrl ?? null;
  let logoImageUrl = gameAssets?.logoImageUrl ?? null;

  if (shop === "steam") {
    iconUrl =
      iconUrl ||
      `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${objectId}/library_600x900.jpg`;
    libraryHeroImageUrl =
      libraryHeroImageUrl ||
      `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${objectId}/library_hero.jpg`;
    logoImageUrl =
      logoImageUrl ||
      `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${objectId}/logo.png`;
  } else if (shop === "epic" && (!iconUrl || (game && !game.iconUrl))) {
    try {
      const titleCleaned = title.replace(/[™®©]/g, "").trim();
      let steamAppId: number | null =
        EPIC_TO_STEAM_APPID_MAP[title] ||
        EPIC_TO_STEAM_APPID_MAP[titleCleaned] ||
        null;

      if (!steamAppId) {
        const res = await axios.get(
          `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(titleCleaned)}&l=english&cc=US`,
          { timeout: 5000 }
        );
        const data = res.data;
        if (data && data.items && data.items.length > 0) {
          steamAppId = data.items[0].id;
        }
      }

      if (steamAppId) {
        iconUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/library_600x900.jpg`;
        libraryHeroImageUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/library_hero.jpg`;
        logoImageUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/logo.png`;
      }
    } catch (err) {
      // ignore errors
    }
  }

  if (game) {
    await downloadsSublevel.del(gameKey);

    game.isDeleted = false;

    // Patch in assets if they were missing (e.g. older imports)
    if (!game.iconUrl && iconUrl) game.iconUrl = iconUrl;
    if (!game.libraryHeroImageUrl && libraryHeroImageUrl)
      game.libraryHeroImageUrl = libraryHeroImageUrl;
    if (!game.logoImageUrl && logoImageUrl) game.logoImageUrl = logoImageUrl;

    await gamesSublevel.put(gameKey, game);
  } else {
    game = {
      title,
      iconUrl,
      libraryHeroImageUrl,
      logoImageUrl,
      objectId,
      shop,
      remoteId: null,
      isDeleted: false,
      playTimeInMilliseconds: 0,
      lastTimePlayed: null,
    };

    await gamesSublevel.put(gameKey, game);
  }

  if (game) {
    await createGame(game).catch(() => {});

    AchievementWatcherManager.firstSyncWithRemoteIfNeeded(
      game.shop,
      game.objectId
    );
  }
};

registerEvent("addGameToLibrary", addGameToLibrary);
