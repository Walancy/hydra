import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { PlayIcon, DownloadIcon, ArrowRightIcon } from "@primer/octicons-react";
import type { DownloadSource, ShopAssets, ShopDetailsWithAssets } from "@types";
import { buildGameDetailsPath, getSteamLanguage } from "@renderer/helpers";
import { Button } from "@renderer/components";
import { levelDBService } from "@renderer/services/leveldb.service";
import { orderBy } from "lodash-es";
import "./home.scss";

interface GameInfoProps {
  game: ShopAssets;
  isBgLight?: boolean;
  onInstallClick?: (game: ShopAssets) => void;
}

const detailsCache = new Map<string, ShopDetailsWithAssets>();
let sourcesCache: DownloadSource[] | null = null;

function formatDate(dateStr: string): string {
  const parts = dateStr.replace(/\./g, "").split(/[\s/]+/);
  if (parts.length < 3) return dateStr;

  const months: Record<string, string> = {
    jan: "Jan",
    feb: "Feb",
    mar: "Mar",
    apr: "Apr",
    may: "May",
    jun: "Jun",
    jul: "Jul",
    aug: "Aug",
    sep: "Sep",
    oct: "Oct",
    nov: "Nov",
    dec: "Dec",
    janeiro: "Jan",
    fevereiro: "Feb",
    março: "Mar",
    abril: "Apr",
    maio: "May",
    junho: "Jun",
    julho: "Jul",
    agosto: "Aug",
    setembro: "Sep",
    outubro: "Oct",
    novembro: "Nov",
    dezembro: "Dec",
  };

  const year = parts.find((p) => p.length === 4 && !isNaN(Number(p)));
  const monthPart = parts.find((p) =>
    Object.keys(months).some((m) => p.toLowerCase().startsWith(m))
  );

  if (!year) return dateStr;
  const monthKey = monthPart
    ? Object.keys(months).find((m) => monthPart.toLowerCase().startsWith(m))
    : undefined;
  const month = monthKey ? months[monthKey] : "";

  return month ? `${month}. ${year}` : year;
}

function cleanPublisher(raw: string): string {
  return raw
    .replace(
      /\s*(co\.,?\s*ltd\.?|inc\.?|llc\.?|corp\.?|ltd\.?|gmbh|s\.?a\.?|s\.?r\.?l\.?|entertainment|interactive|studios?|games?|publishing)/gi,
      ""
    )
    .replace(/[,.\s]+$/, "")
    .trim();
}

const UUID_RE = /^[0-9a-f-]{36}$/i;

export function GameInfo({
  game,
  isBgLight = false,
  onInstallClick,
}: Readonly<GameInfoProps>) {
  const { i18n, t } = useTranslation("home");
  const navigate = useNavigate();
  const [details, setDetails] = useState<ShopDetailsWithAssets | null>(
    detailsCache.get(game.objectId) ?? null
  );
  const fetchedRef = useRef<string>("");
  const [sourceNames, setSourceNames] = useState<string[]>([]);

  useEffect(() => {
    const key = game.objectId;
    if (fetchedRef.current === key) return;
    fetchedRef.current = key;

    const cached = detailsCache.get(key);
    if (cached) {
      setDetails(cached);
      return;
    }

    setDetails(null);
    window.electron
      .getGameShopDetails(key, game.shop, getSteamLanguage(i18n.language))
      .then((result) => {
        if (result) detailsCache.set(key, result);
        setDetails(result);
      })
      .catch(() => {});
  }, [game.objectId, game.shop, i18n.language]);

  useEffect(() => {
    const resolve = async () => {
      if (!sourcesCache) {
        const all = (await levelDBService.values(
          "downloadSources"
        )) as DownloadSource[];
        sourcesCache = orderBy(all, "createdAt", "desc");
      }

      const sources = game.downloadSources ?? [];

      if (!sources.length) {
        setSourceNames(sourcesCache.map((s) => s.name));
        return;
      }

      const areIds = sources.every((s) => UUID_RE.test(s));
      if (!areIds) {
        setSourceNames(sources);
        return;
      }

      const names = sources
        .map((id) => sourcesCache!.find((s) => s.id === id)?.name)
        .filter(Boolean) as string[];
      setSourceNames(names);
    };

    resolve();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.objectId, game.downloadSources?.join(",")]);

  const publisher = details?.publishers?.[0]
    ? cleanPublisher(details.publishers[0])
    : "";
  const date = details?.release_date?.date
    ? formatDate(details.release_date.date)
    : "";

  const meta = [publisher, date].filter(Boolean).join(" - ");

  return (
    <div className="home__details">
      <h1 className="home__game-title">{game.title}</h1>
      {meta && <p className="home__game-meta">{meta}</p>}
      {sourceNames.length > 0 && (
        <div className="home__source-tags">
          {sourceNames.map((name) => (
            <span
              key={name}
              className={`home__source-tag ${isBgLight ? "home__source-tag--dark" : ""}`}
            >
              {name}
            </span>
          ))}
        </div>
      )}
      <div className="home__actions">
        {(game as any).executablePath ? (
          <Button
            className="home__play-button"
            theme={isBgLight ? "dark" : "primary"}
            onClick={() =>
              window.electron.openGame(
                game.shop,
                game.objectId,
                (game as any).executablePath as string
              )
            }
          >
            <PlayIcon size={16} />
            {t("play", { defaultValue: "Jogar" })}
          </Button>
        ) : (
          <Button
            className="home__install-button"
            theme={isBgLight ? "dark" : "primary"}
            onClick={() => {
              if (onInstallClick) {
                onInstallClick(game);
                return;
              }
              const path = buildGameDetailsPath({
                ...game,
                objectId: game.objectId,
              });
              navigate(path, { state: { openRepacks: true } });
              try {
                window.dispatchEvent(
                  new CustomEvent("hydra:openRepacks", {
                    detail: { objectId: game.objectId },
                  })
                );
              } catch (e) {
                // Ignore
              }
            }}
          >
            <DownloadIcon size={16} />
            {t("install", { defaultValue: "Instalar" })}
          </Button>
        )}

        <Button
          className="home__view-game-button"
          theme={isBgLight ? "dark" : "outline"}
          title={t("see_more", { defaultValue: "Ver página" })}
          onClick={() => navigate(buildGameDetailsPath(game))}
        >
          <ArrowRightIcon size={16} />
        </Button>
      </div>
    </div>
  );
}
