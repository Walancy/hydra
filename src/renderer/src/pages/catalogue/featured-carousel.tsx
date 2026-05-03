import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { useSteamGridCover } from "@renderer/hooks/use-steamgrid-cover";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  QuestionIcon,
} from "@primer/octicons-react";
import type { CatalogueSearchResult } from "@types";
import { buildGameDetailsPath, globalImageCache } from "@renderer/helpers";
import Skeleton from "react-loading-skeleton";
import "./featured-carousel.scss";

interface FeaturedCarouselProps {
  games: CatalogueSearchResult[];
}

const SLIDE_INTERVAL = 10000;

const RANDOM_PHRASES = [
  "Especiais para Você",
  "Descubra sua Próxima Aventura",
  "Escolhas Incríveis",
  "Os Mais Jogados",
  "Populares Agora",
  "Tendências da Comunidade",
  "Relaxe e Jogue",
];

const resolveImageSource = (
  imageUrl: string | null | undefined
): string | null => {
  if (!imageUrl) return null;
  const trimmed = imageUrl.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  )
    return trimmed;
  if (trimmed.startsWith("local:"))
    return `local:${trimmed.slice("local:".length).replaceAll("\\", "/")}`;
  const normalized = trimmed.replaceAll("\\", "/");
  if (/^[A-Za-z]:\//.test(normalized) || normalized.startsWith("/"))
    return `local:${normalized}`;
  return normalized;
};

function SlideImage({ game }: { game: CatalogueSearchResult }) {
  const customCover = resolveImageSource(game.coverImageUrl);
  const customLibrary = resolveImageSource(game.libraryImageUrl);
  // @ts-expect-error Game might have ShopAssets fields injected
  const customIcon = resolveImageSource(game.iconUrl);

  const initialPrimarySrc =
    game.shop === "steam"
      ? `https://shared.steamstatic.com/store_item_assets/steam/apps/${game.objectId}/library_600x900_2x.jpg`
      : (customCover ?? customLibrary ?? customIcon ?? null);

  const steamHeader =
    game.shop === "steam"
      ? `https://shared.steamstatic.com/store_item_assets/steam/apps/${game.objectId}/header.jpg`
      : null;

  const [fallbackIndex, setFallbackIndex] = useState(0);
  const [finalFailed, setFinalFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const steamGridCover = useSteamGridCover(
    game.objectId,
    game.title,
    fallbackIndex > 0,
    "vertical"
  );

  const fallbackSources = useMemo(() => {
    const sources: (string | null | undefined)[] = [initialPrimarySrc];

    if (steamGridCover) sources.push(steamGridCover);

    sources.push(customLibrary);
    sources.push(customCover);
    sources.push((game as any).libraryImageUrl);
    sources.push((game as any).coverImageUrl);

    if (game.shop === "steam") {
      sources.push(
        `https://shared.steamstatic.com/store_item_assets/steam/apps/${game.objectId}/library_600x900.jpg`
      );
      sources.push(
        `https://shared.steamstatic.com/store_item_assets/steam/apps/${game.objectId}/capsule_616x353.jpg`
      );
      sources.push(steamHeader);
    }
    sources.push(customIcon);

    return Array.from(new Set(sources.filter(Boolean))) as string[];
  }, [
    initialPrimarySrc,
    steamGridCover,
    customLibrary,
    customCover,
    game,
    steamHeader,
    customIcon,
  ]);

  const activeSrc =
    fallbackIndex === 0
      ? initialPrimarySrc
      : fallbackIndex > 0 && steamGridCover === undefined
        ? undefined
        : fallbackSources[fallbackIndex];

  const [imageLoaded, setImageLoaded] = useState(() =>
    activeSrc ? globalImageCache.has(activeSrc) : false
  );

  const handleImageError = useCallback(() => {
    if (fallbackIndex < fallbackSources.length - 1) {
      setFallbackIndex((prev) => prev + 1);
    } else {
      setFinalFailed(true);
    }
  }, [fallbackIndex, fallbackSources.length]);

  useEffect(() => {
    setImageLoaded(activeSrc ? globalImageCache.has(activeSrc) : false);

    // Check if the image is already cached/complete without firing onLoad
    if (activeSrc && imgRef.current?.complete) {
      if (imgRef.current.naturalWidth > 1) {
        globalImageCache.add(activeSrc);
        setImageLoaded(true);
      } else {
        handleImageError();
      }
    }
  }, [activeSrc, handleImageError]);

  // Se não tem imagem possível e todas as opções falharam, exibe placeholder
  if (
    finalFailed ||
    (!activeSrc &&
      steamGridCover !== undefined &&
      fallbackIndex >= fallbackSources.length)
  ) {
    return (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a1a1a",
          borderRadius: "inherit",
        }}
      >
        <QuestionIcon size={48} fill="rgba(255, 255, 255, 0.2)" />
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {!imageLoaded && (
        <Skeleton
          className="featured-carousel__img-skeleton"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            borderRadius: "inherit",
            height: "100%",
          }}
        />
      )}
      {activeSrc !== undefined && (
        <img
          ref={imgRef}
          key={activeSrc}
          src={activeSrc || undefined}
          alt={game.title}
          className="featured-carousel__img"
          loading="lazy"
          onLoad={(e) => {
            if (e.currentTarget.naturalWidth <= 1) {
              handleImageError();
            } else {
              if (activeSrc) globalImageCache.add(activeSrc);
              setImageLoaded(true);
            }
          }}
          onError={handleImageError}
          style={{
            display: "block",
            opacity: imageLoaded ? 1 : 0,
            transition: "opacity 0.3s ease",
            position: "relative",
            zIndex: 1,
            borderRadius: "inherit",
          }}
        />
      )}
    </div>
  );
}

export function FeaturedCarousel({ games }: Readonly<FeaturedCarouselProps>) {
  const [active, setActive] = useState(0);
  const [phrase] = useState(
    () => RANDOM_PHRASES[Math.floor(Math.random() * RANDOM_PHRASES.length)]
  );
  const navigate = useNavigate();
  const slideTo = useCallback((offsetDir: number) => {
    setActive((prev) => prev + offsetDir);
  }, []);

  const jumpToDot = useCallback(
    (targetIndex: number) => {
      setActive((prev) => {
        const currentMod =
          ((prev % games.length) + games.length) % games.length;
        let diff = targetIndex - currentMod;
        if (diff > games.length / 2) diff -= games.length;
        if (diff < -games.length / 2) diff += games.length;
        return prev + diff;
      });
    },
    [games.length]
  );

  useEffect(() => {
    if (games.length <= 1) return;
    const id = setInterval(() => slideTo(1), SLIDE_INTERVAL);
    return () => clearInterval(id);
  }, [games.length, slideTo]);

  if (!games.length) return null;

  return (
    <div
      className="featured-carousel-wrapper"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        gap: "0",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          maxWidth: "1050px",
          marginTop: "16px",
          marginBottom: "-16px",
        }}
      >
        <div
          style={{
            flex: 1,
            height: "1px",
            background:
              "linear-gradient(to right, transparent, rgba(255, 255, 255, 0.15))",
          }}
        />
        <h2
          style={{
            fontSize: "24px",
            fontWeight: "400",
            color: "var(--foreground, rgba(255, 255, 255, 0.9))",
            letterSpacing: "0.5px",
            margin: "0 24px",
          }}
        >
          {phrase}
        </h2>
        <div
          style={{
            flex: 1,
            height: "1px",
            background:
              "linear-gradient(to left, transparent, rgba(255, 255, 255, 0.15))",
          }}
        />
      </div>
      <div
        className="featured-carousel"
        aria-label="Jogos em destaque"
        style={{
          justifyContent: "center",
          gap: "24px",
          width: "100%",
          maxWidth: "1050px",
        }}
      >
        <button
          type="button"
          className="featured-carousel__nav featured-carousel__nav--left"
          onClick={() => slideTo(-1)}
          aria-label="Anterior"
        >
          <ChevronLeftIcon size={24} />
        </button>

        <div
          className="featured-carousel__track"
          style={{
            position: "relative",
            width: "100%",
            display: "flex",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "320px",
              maxWidth: "30vw",
              aspectRatio: "3.5 / 5",
              pointerEvents: "none",
              opacity: 0,
            }}
          />

          <AnimatePresence initial={false}>
            {[-2, -1, 0, 1, 2].map((relativeOffset) => {
              const absoluteIndex = active + relativeOffset;
              // Calcula de forma cíclica o indice no Game Array
              const gameIndex =
                ((absoluteIndex % games.length) + games.length) % games.length;
              const game = games[gameIndex];

              const isMain = relativeOffset === 0;

              return (
                <motion.button
                  key={absoluteIndex}
                  initial={{ opacity: 0 }}
                  animate={{
                    x: `calc(-50% + ${relativeOffset * 95}%)`,
                    scale: isMain ? 1 : 0.85,
                    opacity: Math.abs(relativeOffset) <= 1 ? 1 : 0,
                    zIndex: 10 - Math.abs(relativeOffset),
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: 0,
                    width: "320px",
                    maxWidth: "30vw",
                    aspectRatio: "3.5 / 5",
                    pointerEvents:
                      Math.abs(relativeOffset) <= 1 ? "auto" : "none",
                  }}
                  className={`featured-carousel__slide featured-carousel__slide--${isMain ? "main" : relativeOffset < 0 ? "prev" : "next"}`}
                  onClick={() => navigate(buildGameDetailsPath(game))}
                  aria-label={game.title}
                >
                  <SlideImage game={game} />
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>

        <button
          type="button"
          className="featured-carousel__nav featured-carousel__nav--right"
          onClick={() => slideTo(1)}
          aria-label="Próximo"
        >
          <ChevronRightIcon size={24} />
        </button>
      </div>

      <div className="featured-carousel__dots" style={{ marginTop: "16px" }}>
        {games.map((_, i) => {
          const currentMod =
            ((active % games.length) + games.length) % games.length;
          return (
            <button
              key={i}
              type="button"
              className={`featured-carousel__dot${i === currentMod ? " featured-carousel__dot--active" : ""}`}
              onClick={() => jumpToDot(i)}
              aria-label={`Slide ${i + 1}`}
            />
          );
        })}
      </div>
    </div>
  );
}
