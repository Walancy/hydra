import { useState } from "react";
import { SearchIcon } from "@primer/octicons-react";
import { useSteamGridCover } from "@renderer/hooks/use-steamgrid-cover";
import type { SearchSuggestion } from "@renderer/hooks/use-search-suggestions";

interface SearchCardProps {
  item: SearchSuggestion;
  isActive: boolean;
  onClick: () => void;
}

function getSteamPrimaryUrl(objectId: string): string {
  return `https://steamcdn-a.akamaihd.net/steam/apps/${objectId}/library_600x900_2x.jpg`;
}

export function SearchCard({ item, isActive, onClick }: SearchCardProps) {
  const [primaryFailed, setPrimaryFailed] = useState(false);
  const [finalFailed, setFinalFailed] = useState(false);

  const steamGridUrl = useSteamGridCover(item.objectId, item.title, primaryFailed);

  const primarySrc =
    item.shop === "steam"
      ? getSteamPrimaryUrl(item.objectId)
      : item.libraryImageUrl ?? item.iconUrl ?? null;

  const activeSrc = primaryFailed ? (steamGridUrl ?? item.libraryImageUrl ?? item.iconUrl ?? null) : primarySrc;

  const cardClass = `search-dropdown__card${isActive ? " search-dropdown__card--active" : ""}`;

  return (
    <button type="button" className={cardClass} onClick={onClick}>
      <div className="search-dropdown__card-image">
        {activeSrc && !finalFailed ? (
          <img
            src={activeSrc}
            alt={item.title}
            onError={() => {
              if (!primaryFailed) {
                setPrimaryFailed(true);
              } else {
                setFinalFailed(true);
              }
            }}
          />
        ) : (
          <div className="card-placeholder">
            <SearchIcon size={24} />
          </div>
        )}
      </div>
      <div className="search-dropdown__card-title">{item.title}</div>
    </button>
  );
}
