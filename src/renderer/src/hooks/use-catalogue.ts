import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { levelDBService } from "@renderer/services/leveldb.service";
import type { DownloadSource } from "@types";
import { useAppDispatch } from "./redux";
import { setGenres, setTags } from "@renderer/features";

export const externalResourcesInstance = axios.create({
  baseURL: import.meta.env.RENDERER_VITE_EXTERNAL_RESOURCES_URL,
});

let globalSteamPublishers: string[] = [];
let globalSteamDevelopers: string[] = [];
let globalDownloadSources: DownloadSource[] = [];
let fetchAttempted = false;

export function useCatalogue() {
  const dispatch = useAppDispatch();

  const [steamPublishers, setSteamPublishers] = useState<string[]>(
    globalSteamPublishers
  );
  const [steamDevelopers, setSteamDevelopers] = useState<string[]>(
    globalSteamDevelopers
  );
  const [downloadSources, setDownloadSources] = useState<DownloadSource[]>(
    globalDownloadSources
  );

  const getSteamUserTags = useCallback(() => {
    externalResourcesInstance.get("/steam-user-tags.json").then((response) => {
      dispatch(setTags(response.data));
    });
  }, [dispatch]);

  const getSteamGenres = useCallback(() => {
    externalResourcesInstance.get("/steam-genres.json").then((response) => {
      dispatch(setGenres(response.data));
    });
  }, [dispatch]);

  const getSteamPublishers = useCallback(() => {
    if (globalSteamPublishers.length > 0) return;
    externalResourcesInstance.get("/steam-publishers.json").then((response) => {
      globalSteamPublishers = response.data;
      setSteamPublishers(response.data);
    });
  }, []);

  const getSteamDevelopers = useCallback(() => {
    if (globalSteamDevelopers.length > 0) return;
    externalResourcesInstance.get("/steam-developers.json").then((response) => {
      globalSteamDevelopers = response.data;
      setSteamDevelopers(response.data);
    });
  }, []);

  const getDownloadSources = useCallback(() => {
    if (globalDownloadSources.length > 0) return;
    levelDBService.values("downloadSources").then((results) => {
      const sources = results as DownloadSource[];
      globalDownloadSources = sources.filter((source) => !!source.fingerprint);
      setDownloadSources(globalDownloadSources);
    });
  }, []);

  useEffect(() => {
    if (fetchAttempted && globalSteamPublishers.length > 0) return;
    fetchAttempted = true;
    getSteamUserTags();
    getSteamGenres();
    getSteamPublishers();
    getSteamDevelopers();
    getDownloadSources();
  }, [
    getSteamUserTags,
    getSteamGenres,
    getSteamPublishers,
    getSteamDevelopers,
    getDownloadSources,
  ]);

  return { steamPublishers, downloadSources, steamDevelopers };
}
