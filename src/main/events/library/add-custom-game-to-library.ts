import { registerEvent } from "../register-event";
import { gamesSublevel, gamesShopAssetsSublevel, levelKeys } from "@main/level";
import { randomUUID } from "node:crypto";
import type { GameShop } from "@types";

const addCustomGameToLibrary = async (
  _event: Electron.IpcMainInvokeEvent,
  title: string,
  executablePath: string,
  iconUrl?: string,
  logoImageUrl?: string,
  libraryHeroImageUrl?: string,
  coverImageUrl?: string
) => {
  const objectId = randomUUID();
  const shop: GameShop = "custom";


  const existingGames = await gamesSublevel.iterator().all();
  const existingEntry = existingGames.find(
    ([_key, game]) => game.executablePath === executablePath && !game.isDeleted
  );

  const finalObjectId = existingEntry ? existingEntry[1].objectId : objectId;
  const finalGameKey = levelKeys.game(shop, finalObjectId);

  const assets = {
    updatedAt: Date.now(),
    objectId: finalObjectId,
    shop,
    title,
    iconUrl: iconUrl || null,
    libraryHeroImageUrl: libraryHeroImageUrl || "",
    libraryImageUrl: libraryHeroImageUrl || coverImageUrl || "",
    logoImageUrl: logoImageUrl || "",
    logoPosition: null,
    coverImageUrl: coverImageUrl || "",
    downloadSources: [],
  };
  await gamesShopAssetsSublevel.put(finalGameKey, assets);

  const game = {
    ...(existingEntry ? existingEntry[1] : {}),
    title,
    iconUrl: iconUrl || null,
    logoImageUrl: logoImageUrl || null,
    libraryHeroImageUrl: libraryHeroImageUrl || null,
    objectId: finalObjectId,
    shop,
    remoteId: null,
    isDeleted: false,
    playTimeInMilliseconds: existingEntry ? existingEntry[1].playTimeInMilliseconds : 0,
    lastTimePlayed: existingEntry ? existingEntry[1].lastTimePlayed : null,
    executablePath,
    favorite: existingEntry ? existingEntry[1].favorite : false,
    automaticCloudSync: false,
    hasManuallyUpdatedPlaytime: false,
    hidden: false,
  };

  await gamesSublevel.put(finalGameKey, game as any);

  return game;
};

registerEvent("addCustomGameToLibrary", addCustomGameToLibrary);
