import { useContext, useEffect, useState } from "react";

import { Button, ConfirmationModal } from "@renderer/components";
import { useTranslation } from "react-i18next";

import type { DownloadSource } from "@types";
import { PlusCircleIcon, SyncIcon, TrashIcon } from "@primer/octicons-react";
import { AddDownloadSourceModal } from "./add-download-source-modal";
import { useAppDispatch, useToast } from "@renderer/hooks";
import { DownloadSourceStatus } from "@shared";
import { settingsContext } from "@renderer/context";
import { useNavigate } from "react-router-dom";
import { setFilters, clearFilters } from "@renderer/features";
import { levelDBService } from "@renderer/services/leveldb.service";
import { orderBy } from "lodash-es";
import { DownloadSourceCard } from "./download-source-card";
import { logger } from "@renderer/logger";
import "./settings-download-sources.scss";

export function SettingsDownloadSources() {
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [downloadSources, setDownloadSources] = useState<DownloadSource[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const { sourceUrl, clearSourceUrl } = useContext(settingsContext);
  const { t } = useTranslation("settings");
  const { showSuccessToast } = useToast();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (sourceUrl) setShowAddModal(true);
  }, [sourceUrl]);

  useEffect(() => {
    const fetchSources = async () => {
      const sources = (await levelDBService.values(
        "downloadSources"
      )) as DownloadSource[];
      setDownloadSources(orderBy(sources, "createdAt", "desc"));
    };
    fetchSources();
  }, []);

  useEffect(() => {
    const hasPending = downloadSources.some(
      (s) =>
        s.status === DownloadSourceStatus.PendingMatching ||
        s.status === DownloadSourceStatus.Matching
    );
    if (!hasPending || !downloadSources.length) return;

    const id = setInterval(async () => {
      try {
        await window.electron.syncDownloadSources();
        const sources = (await levelDBService.values(
          "downloadSources"
        )) as DownloadSource[];
        setDownloadSources(orderBy(sources, "createdAt", "desc"));
      } catch (err) {
        logger.error("Failed to fetch download sources:", err);
      }
    }, 5000);

    return () => clearInterval(id);
  }, [downloadSources]);

  const refreshSources = async () => {
    const sources = (await levelDBService.values(
      "downloadSources"
    )) as DownloadSource[];
    setDownloadSources(orderBy(sources, "createdAt", "desc"));
  };

  const handleRemoveSource = async (source: DownloadSource) => {
    setIsRemoving(true);
    try {
      await window.electron.removeDownloadSource(false, source.id);
      await refreshSources();
      showSuccessToast(t("removed_download_source"));
    } catch (err) {
      logger.error("Failed to remove download source:", err);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleRemoveAll = async () => {
    setIsRemoving(true);
    try {
      await window.electron.removeDownloadSource(true);
      await refreshSources();
      showSuccessToast(t("removed_all_download_sources"));
    } catch (err) {
      logger.error("Failed to remove all download sources:", err);
    } finally {
      setIsRemoving(false);
      setShowConfirmDeleteAll(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await window.electron.syncDownloadSources();
      await refreshSources();
      showSuccessToast(t("download_sources_synced_successfully"));
    } finally {
      setIsSyncing(false);
    }
  };

  const navigateToCatalogue = (fingerprint?: string) => {
    if (!fingerprint) return;
    dispatch(clearFilters());
    dispatch(setFilters({ downloadSourceFingerprints: [fingerprint] }));
    navigate("/catalogue");
  };

  const handleModalClose = () => {
    clearSourceUrl();
    setShowAddModal(false);
  };

  return (
    <>
      <AddDownloadSourceModal
        visible={showAddModal}
        onClose={handleModalClose}
        onAddDownloadSource={refreshSources}
      />

      <ConfirmationModal
        cancelButtonLabel={t("cancel_button_confirmation_delete_all_sources")}
        confirmButtonLabel={t("confirm_button_confirmation_delete_all_sources")}
        descriptionText={t("description_confirmation_delete_all_sources")}
        clickOutsideToClose={false}
        onConfirm={handleRemoveAll}
        visible={showConfirmDeleteAll}
        title={t("title_confirmation_delete_all_sources")}
        onClose={() => setShowConfirmDeleteAll(false)}
        buttonsIsDisabled={isRemoving}
      />

      <p>{t("download_sources_description")}</p>

      <div className="settings-download-sources__header">
        <div className="settings-download-sources__buttons-container">
          <Button
            theme="outline"
            onClick={handleSync}
            disabled={isSyncing || downloadSources.length === 0}
          >
            <SyncIcon size={16} />
            {t("sync")}
          </Button>

          <Button theme="primary" onClick={() => setShowAddModal(true)}>
            <PlusCircleIcon size={16} />
            {t("add_source")}
          </Button>

          <Button
            type="button"
            theme="danger"
            onClick={() => setShowConfirmDeleteAll(true)}
            disabled={isRemoving || isSyncing || !downloadSources.length}
          >
            <TrashIcon />
            {t("button_delete_all_sources")}
          </Button>
          {/* Add download source button removed by user request */}
        </div>
      </div>

      {/* Source cards */}
      <ul className="settings-download-sources__list">
        {downloadSources.map((source) => (
          <DownloadSourceCard
            key={source.id}
            source={source}
            isSyncing={isSyncing}
            isRemoving={isRemoving}
            onRemove={handleRemoveSource}
            onNavigate={navigateToCatalogue}
          />
        ))}
      </ul>
    </>
  );
}
