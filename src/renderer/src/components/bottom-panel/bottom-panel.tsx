import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useAppSelector,
  useDownload,
  useLibrary,
  useToast,
  useUserDetails,
} from "@renderer/hooks";

import "./bottom-panel.scss";

import { useNavigate, useLocation } from "react-router-dom";
import { VERSION_CODENAME } from "@renderer/constants";

export function BottomPanel() {
  const { t } = useTranslation("bottom_panel");

  const navigate = useNavigate();

  const { userDetails } = useUserDetails();

  const { library } = useLibrary();

  const { showSuccessToast } = useToast();

  const { lastPacket, progress, downloadSpeed, eta } = useDownload();

  const extraction = useAppSelector((state) => state.download.extraction);

  const [version, setVersion] = useState("");
  const [sessionHash, setSessionHash] = useState<null | string>("");
  const [commonRedistStatus, setCommonRedistStatus] = useState<string | null>(
    null
  );

  useEffect(() => {
    window.electron.getVersion().then((result) => setVersion(result));
  }, []);

  useEffect(() => {
    const unlisten = window.electron.onCommonRedistProgress(
      ({ log, complete }) => {
        if (log === "Installation timed out" || complete) {
          setCommonRedistStatus(null);

          if (complete) {
            showSuccessToast(
              t("installation_complete"),
              t("installation_complete_message")
            );
          }

          return;
        }

        setCommonRedistStatus(log);
      }
    );

    return () => unlisten();
  }, [t, showSuccessToast]);

  useEffect(() => {
    window.electron.getSessionHash().then((result) => setSessionHash(result));
  }, [userDetails?.id]);

  const status = useMemo(() => {
    if (commonRedistStatus) {
      return t("installing_common_redist", { log: commonRedistStatus });
    }

    if (extraction) {
      const extractingGame = library.find(
        (game) => game.id === extraction.visibleId
      );

      if (extractingGame) {
        const extractionPercentage = Math.round(extraction.progress * 100);
        return t("extracting", {
          title: extractingGame.title,
          percentage: `${extractionPercentage}%`,
        });
      }
    }

    const game = lastPacket
      ? library.find((game) => game.id === lastPacket?.gameId) ||
        (lastPacket.gameId === "test-game-id"
          ? { title: "Test Game" }
          : undefined)
      : undefined;

    if (game) {
      if (lastPacket?.isCheckingFiles)
        return t("checking_files", {
          title: game.title,
          percentage: progress,
        });

      if (lastPacket?.isDownloadingMetadata)
        return t("downloading_metadata", {
          title: game.title,
          percentage: progress,
        });

      const hasBatchInfo =
        lastPacket?.batchFilesTotal != null && lastPacket.batchFilesTotal > 1;

      if (!eta) {
        if (hasBatchInfo) {
          return t("calculating_eta_batch", {
            title: game.title,
            percentage: progress,
            filesDownloaded: lastPacket!.batchFilesDownloaded ?? 0,
            filesTotal: lastPacket!.batchFilesTotal,
          });
        }
        return t("calculating_eta", {
          title: game.title,
          percentage: progress,
        });
      }

      if (hasBatchInfo) {
        return t("downloading_batch", {
          title: game.title,
          percentage: progress,
          eta,
          speed: downloadSpeed,
          filesDownloaded: lastPacket!.batchFilesDownloaded ?? 0,
          filesTotal: lastPacket!.batchFilesTotal,
        });
      }

      return t("downloading", {
        title: game.title,
        percentage: progress,
        eta,
        speed: downloadSpeed,
      });
    }

    return t("no_downloads_in_progress");
  }, [
    t,
    library,
    lastPacket,
    progress,
    eta,
    downloadSpeed,
    commonRedistStatus,
    extraction,
  ]);

  const hasActiveStatus = useMemo(() => {
    return !!commonRedistStatus || !!extraction;
  }, [commonRedistStatus, extraction]);

  const location = useLocation();
  const isSettingsPage = location.pathname.startsWith("/settings");

  if (!hasActiveStatus && !isSettingsPage) {
    return null;
  }

  return (
    <footer className="bottom-panel">
      {hasActiveStatus && (
        <button
          type="button"
          className="bottom-panel__downloads-button"
          onClick={() => navigate("/downloads")}
        >
          <small>{status}</small>
        </button>
      )}

      {isSettingsPage && (
        <button
          data-open-workwonders-changelog-mini
          className="bottom-panel__version-button"
        >
          <small>
            {sessionHash ? `${sessionHash} -` : ""} v{version} &quot;
            {VERSION_CODENAME}&quot;
          </small>
        </button>
      )}
    </footer>
  );
}
