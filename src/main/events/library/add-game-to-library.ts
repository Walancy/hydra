import { registerEvent } from "../register-event";
import type { GameShop } from "@types";
import { createGame } from "@main/services/library-sync";
import {
  downloadsSublevel,
  gamesShopAssetsSublevel,
  gamesSublevel,
  levelKeys,
} from "@main/level";
import { AchievementWatcherManager } from "@main/services/achievements/achievement-watcher-manager";

const addGameToLibrary = async (
  _event: Electron.IpcMainInvokeEvent,
  shop: GameShop,
  objectId: string,
  title: string
) => {
  const gameKey = levelKeys.game(shop, objectId);
  let game = await gamesSublevel.get(gameKey);

  let gameAssets = await gamesShopAssetsSublevel.get(gameKey);

  if (!gameAssets && shop !== "custom") {
    const { getGameAssets } = await import("../catalogue/get-game-assets");
    const result = await getGameAssets(objectId, shop);
    if (result) {
      gameAssets = { ...result, updatedAt: Date.now() };
    }
  }

  if (game) {
    await downloadsSublevel.del(gameKey);

    game.isDeleted = false;

    await gamesSublevel.put(gameKey, game);
  } else {
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
    }

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
