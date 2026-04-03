import { useRef } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@primer/octicons-react";
import {
  Flame,
  Map as MapIcon,
  Shield,
  Crosshair,
  Monitor,
  Trophy,
  Car,
  Puzzle,
  Ghost,
  Globe,
  Swords,
  Building,
} from "lucide-react";
import "./category-explorer.scss";

const STEAM_GENRES = [
  { key: "action", label: "Ação", icon: Flame },
  { key: "adventure", label: "Aventura", icon: MapIcon },
  { key: "rpg", label: "RPG", icon: Shield },
  { key: "strategy", label: "Estratégia", icon: Crosshair },
  { key: "simulation", label: "Simulação", icon: Monitor },
  { key: "sports", label: "Esportes", icon: Trophy },
  { key: "racing", label: "Corrida", icon: Car },
  { key: "puzzle", label: "Quebra-Cabeça", icon: Puzzle },
  { key: "horror", label: "Terror", icon: Ghost },
  { key: "openworld", label: "Mundo Aberto", icon: Globe },
  { key: "fighting", label: "Luta", icon: Swords },
  { key: "city", label: "Construção de Cidades", icon: Building },
];

interface CategoryExplorerProps {
  onSelectGenre: (genre: string) => void;
}

export function CategoryExplorer({
  onSelectGenre,
}: Readonly<CategoryExplorerProps>) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!trackRef.current) return;
    trackRef.current.scrollBy({
      left: dir === "left" ? -400 : 400,
      behavior: "smooth",
    });
  };

  return (
    <section className="cat-explorer">
      <h2 className="cat-explorer__title">Explore por categoria</h2>

      <div className="cat-explorer__wrapper">
        <button
          type="button"
          className="cat-explorer__nav cat-explorer__nav--left"
          onClick={() => scroll("left")}
          aria-label="Anterior"
        >
          <ChevronLeftIcon size={24} />
        </button>

        <div className="cat-explorer__track" ref={trackRef}>
          {STEAM_GENRES.map((genre) => (
            <button
              key={genre.key}
              type="button"
              className={`cat-explorer__card cat-explorer__card--${genre.key}`}
              onClick={() => onSelectGenre(genre.label)}
              aria-label={`Explorar ${genre.label}`}
            >
              <genre.icon size={28} className="cat-explorer__icon" />
              <span className="cat-explorer__label">{genre.label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="cat-explorer__nav cat-explorer__nav--right"
          onClick={() => scroll("right")}
          aria-label="Próximo"
        >
          <ChevronRightIcon size={24} />
        </button>
      </div>
    </section>
  );
}
