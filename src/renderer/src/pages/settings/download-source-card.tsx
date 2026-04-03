import { memo } from "react";
import { useTranslation } from "react-i18next";
import { useFormat } from "@renderer/hooks/use-format";
import { DownloadSourceStatus } from "@shared";
import type { DownloadSource } from "@types";
import {
  LinkExternalIcon,
  NoEntryIcon,
  SyncIcon,
  CheckCircleIcon,
  AlertIcon,
  ServerIcon,
} from "@primer/octicons-react";
import { Button } from "@renderer/components";
import "./download-source-card.scss";

interface DownloadSourceCardProps {
  source: DownloadSource;
  isSyncing: boolean;
  isRemoving: boolean;
  onRemove: (source: DownloadSource) => void;
  onNavigate: (fingerprint?: string) => void;
}

const statusConfig = {
  [DownloadSourceStatus.Matched]: {
    color: "var(--ds-card-status-ok)",
    icon: CheckCircleIcon,
    labelKey: "download_source_matched",
  },
  [DownloadSourceStatus.PendingMatching]: {
    color: "var(--ds-card-status-pending)",
    icon: SyncIcon,
    labelKey: "download_source_pending_matching",
    spin: true,
  },
  [DownloadSourceStatus.Matching]: {
    color: "var(--ds-card-status-pending)",
    icon: SyncIcon,
    labelKey: "download_source_matching",
    spin: true,
  },
  [DownloadSourceStatus.Failed]: {
    color: "var(--ds-card-status-fail)",
    icon: AlertIcon,
    labelKey: "download_source_failed",
  },
} as const;

export const DownloadSourceCard = memo(function DownloadSourceCard({
  source,
  isSyncing,
  isRemoving,
  onRemove,
  onNavigate,
}: Readonly<DownloadSourceCardProps>) {
  const { t } = useTranslation("settings");
  const { numberFormatter } = useFormat();

  const config = statusConfig[source.status];
  const StatusIcon = config.icon;
  const isPending =
    source.status === DownloadSourceStatus.PendingMatching ||
    source.status === DownloadSourceStatus.Matching;

  return (
    <li
      className={`ds-card${isSyncing ? " ds-card--syncing" : ""}${isPending ? " ds-card--pending" : ""}`}
    >
      <div className="ds-card__body">
        {/* Header row */}
        <div className="ds-card__header">
          <div className="ds-card__title-group">
            <span className="ds-card__name">
              <ServerIcon size={14} className="ds-card__title-icon" />
              {source.name}
            </span>
            <span
              className={`ds-card__status${isPending ? " ds-card__status--spin" : ""}`}
              style={{ color: config.color }}
              title={t(config.labelKey)}
            >
              <StatusIcon size={12} />
              {t(config.labelKey)}
            </span>
          </div>

          <Button
            type="button"
            theme="outline"
            onClick={() => onRemove(source)}
            disabled={isRemoving || isSyncing}
            aria-label={t("remove_download_source")}
          >
            <NoEntryIcon size={14} />
            {t("remove_download_source")}
          </Button>
        </div>

        {/* URL row */}
        <div className="ds-card__url-row">
          <span className="ds-card__url" title={source.url}>
            {source.url}
          </span>
        </div>

        {/* Footer: count + navigate */}
        <div className="ds-card__footer">
          <span className="ds-card__count">
            {isPending
              ? t("download_source_no_information")
              : t("download_count", {
                  count: source.downloadCount,
                  countFormatted: numberFormatter.format(source.downloadCount),
                })}
          </span>

          {source.fingerprint && (
            <button
              type="button"
              className="ds-card__navigate"
              onClick={() => onNavigate(source.fingerprint)}
              title={t("view_in_catalogue", {
                defaultValue: "Ver no catálogo",
              })}
            >
              <LinkExternalIcon size={12} />
              {t("view_in_catalogue", { defaultValue: "Ver no catálogo" })}
            </button>
          )}
        </div>
      </div>
    </li>
  );
});
