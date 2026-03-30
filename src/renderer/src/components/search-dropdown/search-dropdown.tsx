import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ClockIcon, SearchIcon, XIcon } from "@primer/octicons-react";
import { AnimatePresence, motion } from "framer-motion";

import { useTranslation } from "react-i18next";
import type { SearchHistoryEntry } from "@renderer/hooks/use-search-history";
import type { SearchSuggestion } from "@renderer/hooks/use-search-suggestions";
import { useGamepad } from "@renderer/hooks";
import "./search-dropdown.scss";

export interface SearchDropdownProps {
  visible: boolean;
  historyItems: SearchHistoryEntry[];
  suggestions: SearchSuggestion[];
  isLoadingSuggestions: boolean;
  onSelectHistory: (query: string) => void;
  onSelectSuggestion: (suggestion: SearchSuggestion) => void;
  onRemoveHistoryItem: (query: string) => void;
  onClearHistory: () => void;
  onClose: () => void;
  searchValue: string;
  onSearchChange: (val: string) => void;
  onExecuteSearch: () => void;
  placeholder?: string;
}

export function SearchDropdown({
  visible,
  historyItems,
  suggestions,
  isLoadingSuggestions,
  onSelectHistory,
  onSelectSuggestion,
  onRemoveHistoryItem,
  onClearHistory,
  onClose,
  searchValue,
  onSearchChange,
  onExecuteSearch,
  placeholder,
}: SearchDropdownProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation("header");

  useEffect(() => {
    if (visible && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [visible, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onExecuteSearch();
    }
  };

  useGamepad({
    onButton: {
      B: () => {
        onClose();
        return true;
      },
    },
  });

  const hasHistory = historyItems.length > 0;
  const hasSuggestions = suggestions.length > 0;

  const dropdownContent = (
    <AnimatePresence>
      {visible && (
        <motion.div 
          className="search-dropdown"
          initial={{ opacity: 0, filter: "blur(10px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, filter: "blur(10px)", pointerEvents: "none" }}
          transition={{ duration: 0.15, ease: "easeInOut" }}
        >
      <div className="search-dropdown__content" ref={containerRef}>
        <div className="search-dropdown__input-container">
          <SearchIcon size={16} className="search-dropdown__search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="search-dropdown__input"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
          />
          {searchValue && (
            <button
              className="search-dropdown__clear-button"
              onClick={() => {
                onSearchChange("");
                inputRef.current?.focus();
              }}
            >
              <XIcon size={14} />
            </button>
          )}
        </div>

        {hasSuggestions && (
          <div style={{ width: "100%" }}>
            <span
              className="search-dropdown__section-title"
              style={{ padding: "0 32px" }}
            >
              {t("suggestions")}
            </span>
            <div className="search-dropdown__cards-scroll" tabIndex={0}>
              {suggestions.map((item) => (
                <button
                  key={`${item.objectId}-${item.shop}`}
                  type="button"
                  className="search-dropdown__card"
                  onClick={() => onSelectSuggestion(item)}
                >
                  {item.libraryImageUrl ? (
                    <img src={item.libraryImageUrl} alt={item.title} />
                  ) : item.shop === "steam" ? (
                    <img 
                      src={`https://steamcdn-a.akamaihd.net/steam/apps/${item.objectId}/library_600x900_2x.jpg`} 
                      alt={item.title} 
                      onError={(e) => {
                        if (item.iconUrl && e.currentTarget.src !== item.iconUrl) {
                          e.currentTarget.src = item.iconUrl;
                        }
                      }}
                    />
                  ) : item.iconUrl ? (
                    <img src={item.iconUrl} alt={item.title} />
                  ) : (
                    <div className="card-placeholder">
                      <SearchIcon size={24} />
                    </div>
                  )}
                  <div className="card-title-overlay">{item.title}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!hasSuggestions && hasHistory && (
          <div style={{ width: "100%" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                padding: "0 32px",
              }}
            >
              <span
                className="search-dropdown__section-title"
                style={{ margin: 0 }}
              >
                {t("recent_searches")}
              </span>
              <button
                type="button"
                className="search-dropdown__clear-text-button"
                onClick={onClearHistory}
              >
                {t("clear_history")}
              </button>
            </div>
            <div className="search-dropdown__cards-scroll">
              {historyItems.map((item) => (
                <button
                  key={`history-${item.query}-${item.timestamp}`}
                  type="button"
                  className="search-dropdown__card search-dropdown__card--history"
                  style={{
                    height: 60,
                    flex: "0 0 200px",
                    padding: 12,
                    justifyContent: "center",
                  }}
                  onClick={() => onSelectHistory(item.query)}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      height: "100%",
                    }}
                  >
                    <ClockIcon size={16} fill="rgba(255,255,255,0.4)" />
                    <span
                      style={{
                        color: "#fff",
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        flex: 1,
                        textAlign: "left",
                      }}
                    >
                      {item.query}
                    </span>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveHistoryItem(item.query);
                      }}
                      style={{
                        padding: 4,
                        borderRadius: 100,
                        background: "rgba(255,255,255,0.1)",
                        zIndex: 2,
                      }}
                    >
                      <XIcon size={12} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoadingSuggestions && !hasSuggestions && !hasHistory && (
          <div className="search-dropdown__loading">{t("loading")}</div>
        )}
      </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(dropdownContent, document.body);
}
