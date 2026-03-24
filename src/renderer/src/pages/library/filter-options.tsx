import { useTranslation } from "react-i18next";
import "./filter-options.scss";

export type SortOption =
  | "title_asc"
  | "recently_played"
  | "most_played"
  | "installed_first"
  | "title_desc";

interface FilterOptionsProps {
  sortBy: SortOption;
  onSortChange: (sortBy: SortOption) => void;
}

export function FilterOptions({
  sortBy,
  onSortChange,
}: Readonly<FilterOptionsProps>) {
  const { t } = useTranslation("library");

  const options: { value: SortOption; labelKey: string }[] = [
    { value: "recently_played", labelKey: "recently_played" },
    { value: "most_played", labelKey: "sort_most_played" },
    { value: "title_asc", labelKey: "sort_title_asc" },
    { value: "title_desc", labelKey: "sort_title_desc" },
    { value: "installed_first", labelKey: "sort_installed_first" },
  ];

  return (
    <div
      className="library-filter-options__pills"
      role="group"
      aria-label={t("sort_by")}
    >
      {options.map(({ value, labelKey }) => (
        <button
          key={value}
          type="button"
          className={`library-filter-options__pill${
            sortBy === value ? " library-filter-options__pill--active" : ""
          }`}
          onClick={() => onSortChange(value)}
        >
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
}
