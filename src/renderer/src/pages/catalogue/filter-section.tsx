import { CheckboxField } from "@renderer/components/checkbox-field/checkbox-field";
import { useFormat } from "@renderer/hooks";
import { ChevronDownIcon, SearchIcon } from "@primer/octicons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./filter.scss";
import List from "rc-virtual-list";
import { useTranslation } from "react-i18next";

export interface FilterSectionProps {
  title: string;
  items: {
    label: string;
    value: string | number;
    checked: boolean;
  }[];
  onSelect: (value: string | number) => void;
  icon: React.ReactNode;
  onClear: () => void;
}

export function FilterSection({
  title,
  items,
  icon,
  onSelect,
  onClear,
}: FilterSectionProps) {
  const content = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [height, setHeight] = useState(0);
  const { t } = useTranslation("catalogue");

  const filteredItems = useMemo(() => {
    if (search.length > 0) {
      return items.filter((item) =>
        item.label.toLowerCase().includes(search.toLowerCase())
      );
    }

    return items;
  }, [items, search]);

  const selectedItemsCount = useMemo(() => {
    return items.filter((item) => item.checked).length;
  }, [items]);

  const onSearch = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const { formatNumber } = useFormat();

  useEffect(() => {
    if (content.current && content.current.scrollHeight !== height) {
      setHeight(isOpen ? content.current.scrollHeight : 0);
    } else if (!isOpen) {
      setHeight(0);
    }
  }, [isOpen, filteredItems, height, search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!items.length) {
    return null;
  }

  return (
    <div className="filter-section" ref={containerRef}>
      <button
        type="button"
        className="filter-section__button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
      >
        <ChevronDownIcon
          className={`filter-section__chevron ${
            isOpen ? "filter-section__chevron--open" : ""
          }`}
        />
        <div className="filter-section__header">
          {icon}
          <h3 className="filter-section__title">{title}</h3>
        </div>
      </button>

      <div
        ref={content}
        className="filter-section__content"
        style={{ maxHeight: `${height}px` }}
        data-gamepad-ignore={!isOpen ? "true" : undefined}
      >
        <div className="filter-section__content-inner">
          {selectedItemsCount > 0 ? (
            <button
              type="button"
              className="filter-section__clear-button"
              onClick={onClear}
            >
              {t("clear_filters", {
                filterCount: formatNumber(selectedItemsCount),
              })}
            </button>
          ) : (
            <span className="filter-section__count">
              {t("filter_count", {
                filterCount: formatNumber(items.length),
              })}
            </span>
          )}

          <div
            className="filter-section__search header__search-bar header__search-bar--inline"
            style={{ width: "100%", padding: "6px 12px", minWidth: "unset" }}
          >
            <SearchIcon size={14} className="header__search-bar-icon" />
            <input
              type="text"
              className="header__search-input"
              placeholder={t("search", { defaultValue: "Filtrar..." })}
              onChange={(e) => onSearch(e.target.value)}
              value={search}
            />
          </div>

          <List
            data={filteredItems}
            height={
              32 * (filteredItems.length > 10 ? 10 : filteredItems.length)
            }
            itemHeight={32}
            itemKey="value"
            styles={{
              verticalScrollBar: {
                backgroundColor: "rgba(255, 255, 255, 0.03)",
              },
              verticalScrollBarThumb: {
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                borderRadius: "24px",
              },
            }}
          >
            {(item) => (
              <div key={item.value} className="filter-section__item">
                <CheckboxField
                  label={item.label}
                  checked={item.checked}
                  onChange={() => onSelect(item.value)}
                />
              </div>
            )}
          </List>
        </div>
      </div>
    </div>
  );
}
