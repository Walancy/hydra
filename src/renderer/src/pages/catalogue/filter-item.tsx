import { XIcon } from "@primer/octicons-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Tooltip } from "react-tooltip";
import "./filter.scss";

interface FilterItemProps {
  filter: string;
  filterType: string;
  icon: React.ReactNode;
  onRemove: () => void;
}

export function FilterItem({
  filter,
  filterType,
  icon,
  onRemove,
}: FilterItemProps) {
  const { t } = useTranslation("catalogue");
  const tooltipId = useId();

  return (
    <div className="filter-item">
      <div
        className="filter-item__icon"
        data-tooltip-id={tooltipId}
        data-tooltip-content={filterType}
        data-tooltip-place="top"
      >
        {icon}
      </div>
      <span className="filter-item__label">{filter}</span>
      <button
        type="button"
        onClick={onRemove}
        className="filter-item__remove-button"
        aria-label={`${t("clear_filters", { filterCount: 1 })}: ${filter}`}
      >
        <XIcon size={13} aria-hidden="true" />
      </button>
      <Tooltip id={tooltipId} style={{ zIndex: 9999 }} />
    </div>
  );
}
