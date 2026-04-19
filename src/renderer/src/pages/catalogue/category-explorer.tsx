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

const STEAM_CATEGORIES = [
  { key: "action", type: "genre", value: "Action", label: "Ação", icon: Flame },
  {
    key: "adventure",
    type: "genre",
    value: "Adventure",
    label: "Aventura",
    icon: MapIcon,
  },
  { key: "rpg", type: "genre", value: "RPG", label: "RPG", icon: Shield },
  {
    key: "strategy",
    type: "genre",
    value: "Strategy",
    label: "Estratégia",
    icon: Crosshair,
  },
  {
    key: "simulation",
    type: "genre",
    value: "Simulation",
    label: "Simulação",
    icon: Monitor,
  },
  {
    key: "sports",
    type: "genre",
    value: "Sports",
    label: "Esportes",
    icon: Trophy,
  },
  {
    key: "racing",
    type: "genre",
    value: "Racing",
    label: "Corrida",
    icon: Car,
  },
  {
    key: "puzzle",
    type: "tag",
    value: "Puzzle",
    label: "Quebra-Cabeça",
    icon: Puzzle,
  },
  { key: "horror", type: "tag", value: "Horror", label: "Terror", icon: Ghost },
  {
    key: "openworld",
    type: "tag",
    value: "Open World",
    label: "Mundo Aberto",
    icon: Globe,
  },
  {
    key: "fighting",
    type: "tag",
    value: "Fighting",
    label: "Luta",
    icon: Swords,
  },
  {
    key: "city",
    type: "tag",
    value: "City Builder",
    label: "Construção de Cidades",
    icon: Building,
  },
];

export interface CategoryExplorerItem {
  type: "genre" | "tag";
  value: string;
}

interface CategoryExplorerProps {
  onSelect: (item: CategoryExplorerItem) => void;
}

export function CategoryExplorer({
  onSelect,
}: Readonly<CategoryExplorerProps>) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    scrollLeft: 0,
    hasDragged: false,
  });

  const scroll = (dir: "left" | "right") => {
    if (!trackRef.current) return;
    trackRef.current.scrollBy({
      left: dir === "left" ? -400 : 400,
      behavior: "smooth",
    });
  };

  const handleCardClick = (e: React.MouseEvent, item: CategoryExplorerItem) => {
    if (dragRef.current.hasDragged) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onSelect(item);
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

        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <div
          className="cat-explorer__track"
          ref={trackRef}
          onMouseDown={(e) => {
            dragRef.current.isDragging = true;
            dragRef.current.startX = e.pageX - e.currentTarget.offsetLeft;
            dragRef.current.scrollLeft = e.currentTarget.scrollLeft;
            dragRef.current.hasDragged = false;
            e.currentTarget.style.scrollBehavior = "auto";
            e.currentTarget.style.cursor = "grabbing";
          }}
          onMouseLeave={(e) => {
            dragRef.current.isDragging = false;
            e.currentTarget.style.scrollBehavior = "";
            e.currentTarget.style.cursor = "";
          }}
          onMouseUp={(e) => {
            dragRef.current.isDragging = false;
            e.currentTarget.style.scrollBehavior = "";
            e.currentTarget.style.cursor = "";
          }}
          onMouseMove={(e) => {
            if (!dragRef.current.isDragging) return;
            e.preventDefault();
            const x = e.pageX - e.currentTarget.offsetLeft;
            const walk = x - dragRef.current.startX;
            if (Math.abs(walk) > 5) dragRef.current.hasDragged = true;
            e.currentTarget.scrollLeft = dragRef.current.scrollLeft - walk;
          }}
        >
          {STEAM_CATEGORIES.map((genre) => (
            <button
              key={genre.key}
              type="button"
              className={`cat-explorer__card cat-explorer__card--${genre.key}`}
              onClick={(e) =>
                handleCardClick(e, {
                  type: genre.type as "genre" | "tag",
                  value: genre.value,
                })
              }
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
