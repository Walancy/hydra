import { useTranslation } from "react-i18next";

import { useAppSelector, useDownload, useLibrary } from "@renderer/hooks";

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { BinaryNotFoundModal } from "../shared-modals/binary-not-found-modal";
import "./downloads.scss";
import { DeleteGameModal } from "./delete-game-modal";
import { DownloadGroup } from "./download-group";
import type { GameShop, LibraryGame, SeedingStatus } from "@types";
import { orderBy } from "lodash-es";
import { ArrowDownIcon } from "@primer/octicons-react";

const PixelBlast = lazy(
  () => import("@renderer/components/PixelBlast/PixelBlast")
);

export default function Downloads() {
  const { library, updateLibrary } = useLibrary();
  const extraction = useAppSelector((state) => state.download.extraction);

  const { t } = useTranslation("downloads");

  const gameToBeDeleted = useRef<[GameShop, string] | null>(null);

  const [showBinaryNotFoundModal, setShowBinaryNotFoundModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { removeGameInstaller, pauseSeeding } = useDownload();

  const handleDeleteGame = async () => {
    if (gameToBeDeleted.current) {
      const [shop, objectId] = gameToBeDeleted.current;

      await pauseSeeding(shop, objectId);
      await removeGameInstaller(shop, objectId);
    }
  };

  const { lastPacket } = useDownload();

  const [seedingStatus, setSeedingStatus] = useState<SeedingStatus[]>([]);

  useEffect(() => {
    window.electron.onSeedingStatus((value) => setSeedingStatus(value));

    const unsubscribeExtraction = window.electron.onExtractionComplete(() => {
      updateLibrary();
    });

    return () => {
      unsubscribeExtraction();
    };
  }, [updateLibrary]);

  const handleOpenGameInstaller = (shop: GameShop, objectId: string) =>
    window.electron.openGameInstaller(shop, objectId).then((wasOpened) => {
      if (!wasOpened) {
        setShowBinaryNotFoundModal(true);
      }

      updateLibrary();
    });

  const handleOpenDeleteGameModal = (shop: GameShop, objectId: string) => {
    gameToBeDeleted.current = [shop, objectId];
    setShowDeleteModal(true);
  };

  const libraryGroup: Record<string, LibraryGame[]> = useMemo(() => {
    const initialValue: Record<string, LibraryGame[]> = {
      downloading: [],
      queued: [],
      complete: [],
    };

    const result = orderBy(
      library,
      (game) => game.download?.timestamp,
      "desc"
    ).reduce((prev, next) => {
      /* Game has been manually added to the library */
      if (!next.download) return prev;

      /* Is downloading or extracting */
      const isExtracting =
        next.download.extracting || extraction?.visibleId === next.id;
      if (lastPacket?.gameId === next.id || isExtracting)
        return { ...prev, downloading: [...prev.downloading, next] };

      /* Is either queued, paused, or failed */
      if (
        next.download.queued ||
        next.download?.status === "paused" ||
        next.download?.status === "error"
      )
        return { ...prev, queued: [...prev.queued, next] };

      return { ...prev, complete: [...prev.complete, next] };
    }, initialValue);

    const queued = orderBy(result.queued, (game) => game.download?.timestamp, [
      "desc",
    ]);

    const complete = orderBy(result.complete, (game) =>
      game.download?.progress === 1 ? 0 : 1
    );

    return {
      ...result,
      queued,
      complete,
    };
  }, [library, lastPacket?.gameId, extraction?.visibleId]);

  const queuedGameIds = useMemo(
    () => libraryGroup.queued.map((game) => game.id),
    [libraryGroup.queued]
  );

  const downloadGroups = [
    {
      title: t("download_in_progress"),
      library: libraryGroup.downloading,
      queuedGameIds: [] as string[],
    },
    {
      title: t("queued_downloads"),
      library: libraryGroup.queued,
      queuedGameIds,
    },
    {
      title: t("downloads_completed"),
      library: libraryGroup.complete,
      queuedGameIds: [] as string[],
    },
  ];

  const hasItemsInLibrary = useMemo(() => {
    return Object.values(libraryGroup).some((group) => group.length > 0);
  }, [libraryGroup]);

  return (
    <>
      <div className="downloads__bg-effect">
        <Suspense fallback={null}>
          <PixelBlast
            variant="square"
            pixelSize={3}
            color="#07e874ff"
            patternScale={3.5}
            patternDensity={1.6}
            enableRipples
            rippleSpeed={0.3}
            rippleThickness={0.07}
            rippleIntensityScale={1.2}
            speed={0.4}
            transparent
            edgeFade={0.4}
          />
        </Suspense>
      </div>

      <BinaryNotFoundModal
        visible={showBinaryNotFoundModal}
        onClose={() => setShowBinaryNotFoundModal(false)}
      />

      <DeleteGameModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        deleteGame={handleDeleteGame}
      />

      {hasItemsInLibrary ? (
        <section className="downloads__container">
          <div className="downloads__groups">
            {downloadGroups.map((group) => (
              <DownloadGroup
                key={group.title}
                title={group.title}
                library={group.library}
                openDeleteGameModal={handleOpenDeleteGameModal}
                openGameInstaller={handleOpenGameInstaller}
                seedingStatus={seedingStatus}
                queuedGameIds={group.queuedGameIds}
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="downloads__no-downloads">
          <div className="downloads__arrow-icon">
            <ArrowDownIcon size={24} />
          </div>
          <h2>{t("no_downloads_title")}</h2>
          <p>{t("no_downloads_description")}</p>
        </div>
      )}
    </>
  );
}
