import { useState, useEffect } from "react";
import { SearchIcon } from "@primer/octicons-react";
import { useSteamGridCover } from "@renderer/hooks/use-steamgrid-cover";
import type { SearchSuggestion } from "@renderer/hooks/use-search-suggestions";
import Skeleton from "react-loading-skeleton";
import { globalImageCache } from "@renderer/helpers";
import { useRef } from "react";

interface SearchCardProps {
  item: SearchSuggestion;
  isActive: boolean;
  onClick: () => void;
}

function getSteamPrimaryUrl(objectId: string): string {
  return `https://steamcdn-a.akamaihd.net/steam/apps/${objectId}/library_600x900_2x.jpg`;
}

export function SearchCard({ item, isActive, onClick }: SearchCardProps) {
  const initialPrimarySrc =
    item.shop === "steam"
      ? getSteamPrimaryUrl(item.objectId)
      : (item.libraryImageUrl ?? item.iconUrl ?? null);

  const [primaryFailed, setPrimaryFailed] = useState(!initialPrimarySrc);
  const [finalFailed, setFinalFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const steamGridUrl = useSteamGridCover(
    item.objectId,
    item.title,
    primaryFailed
  );

  const primarySrc =
    item.shop === "steam"
      ? getSteamPrimaryUrl(item.objectId)
      : (item.libraryImageUrl ?? item.iconUrl ?? null);

  const activeSrc = primaryFailed
    ? (steamGridUrl ?? item.libraryImageUrl ?? item.iconUrl ?? null)
    : primarySrc;

  const cardClass = `search-dropdown__card${isActive ? " search-dropdown__card--active" : ""}`;

  const [imageLoaded, setImageLoaded] = useState(() =>
    activeSrc ? globalImageCache.has(activeSrc) : false
  );

  // Reset loaded state when source changes
  useEffect(() => {
    setImageLoaded(activeSrc ? globalImageCache.has(activeSrc) : false);
    if (
      activeSrc &&
      imgRef.current?.complete &&
      imgRef.current.naturalWidth > 0
    ) {
      globalImageCache.add(activeSrc);
      setImageLoaded(true);
    }
  }, [activeSrc]);

  return (
    <button type="button" className={cardClass} onClick={onClick}>
      <div
        className="search-dropdown__card-image"
        style={{ position: "relative" }}
      >
        {activeSrc && !finalFailed && !imageLoaded && (
          <Skeleton
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              borderRadius: "inherit",
              height: "100%",
            }}
          />
        )}
        {activeSrc && !finalFailed ? (
          <img
            ref={imgRef}
            key={activeSrc}
            src={activeSrc}
            alt={item.title}
            draggable={false}
            onLoad={() => {
              if (activeSrc) globalImageCache.add(activeSrc);
              setImageLoaded(true);
            }}
            style={{
              opacity: imageLoaded ? 1 : 0,
              transition: "opacity 0.3s ease",
            }}
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
