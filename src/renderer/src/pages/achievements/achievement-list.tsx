import { useState, useMemo } from "react";
import { useDate } from "@renderer/hooks";
import type { UserAchievement } from "@types";
import { useTranslation } from "react-i18next";
import {
  EyeClosedIcon,
  SearchIcon,
  SortAscIcon,
  SortDescIcon,
} from "@primer/octicons-react";
import HydraIcon from "@renderer/assets/icons/hydra.svg?react";
import { useSubscription } from "@renderer/hooks/use-subscription";
import { SelectField, Button } from "@renderer/components";
import "./achievements.scss";

interface AchievementListProps {
  achievements: UserAchievement[];
}

export function AchievementList({
  achievements,
}: Readonly<AchievementListProps>) {
  const { t } = useTranslation("achievement");
  const { showHydraCloudModal } = useSubscription();
  const { formatDateTime } = useDate();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("points");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filteredAchievements = useMemo(() => {
    return achievements
      .filter((ach) => {
        if (
          searchQuery &&
          !ach.displayName.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !ach.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
          return false;
        if (filterStatus === "unlocked" && !ach.unlocked) return false;
        if (filterStatus === "locked" && ach.unlocked) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.unlocked && !b.unlocked) return -1;
        if (!a.unlocked && b.unlocked) return 1;

        let comparison = 0;
        if (sortBy === "points") {
          comparison = (a.points ?? 0) - (b.points ?? 0);
        } else if (sortBy === "name") {
          comparison = a.displayName.localeCompare(b.displayName);
        } else if (sortBy === "date") {
          const timeA = Number(a.unlockTime ?? 0);
          const timeB = Number(b.unlockTime ?? 0);
          comparison = timeA - timeB;
        }
        return sortOrder === "asc" ? comparison : -comparison;
      });
  }, [achievements, searchQuery, filterStatus, sortBy, sortOrder]);

  return (
    <div className="achievements__list-container">
      <div className="achievements__toolbar">
        <div
          className="header__search-bar header__search-bar--inline"
          style={{
            flex: 1,
            width: "100%",
            padding: "8px 16px",
            minWidth: "200px",
            maxWidth: "350px",
          }}
        >
          <SearchIcon size={16} className="header__search-bar-icon" />
          <input
            type="text"
            className="header__search-input"
            placeholder={t("search", { defaultValue: "Buscar conquista..." })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="achievements__toolbar-filters">
          <SelectField
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={[
              {
                key: "all",
                value: "all",
                label: t("all_achievements", {
                  defaultValue: "Todas as Conquistas",
                }),
              },
              {
                key: "unlocked",
                value: "unlocked",
                label: t("unlocked", { defaultValue: "Desbloqueadas" }),
              },
              {
                key: "locked",
                value: "locked",
                label: t("locked", { defaultValue: "Bloqueadas" }),
              },
            ]}
            theme="dark"
          />
          <SelectField
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            options={[
              {
                key: "points",
                value: "points",
                label: t("points", { defaultValue: "Pontos" }),
              },
              {
                key: "name",
                value: "name",
                label: t("name", { defaultValue: "Nome" }),
              },
              {
                key: "date",
                value: "date",
                label: t("date", { defaultValue: "Data" }),
              },
            ]}
            theme="dark"
          />
          <Button
            theme="outline"
            onClick={() =>
              setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
            }
            style={{ width: "42px", height: "42px", padding: 0, flexShrink: 0 }}
          >
            {sortOrder === "asc" ? (
              <SortAscIcon size={16} />
            ) : (
              <SortDescIcon size={16} />
            )}
          </Button>
        </div>
      </div>

      <ul className="achievements__grid">
        {filteredAchievements.map((achievement) => (
          <li
            key={achievement.name}
            className={`achievements__card ${!achievement.unlocked ? "achievements__card--locked" : ""}`}
          >
            <div className="achievements__card-header">
              <img
                className="achievements__card-image"
                src={achievement.icon}
                alt={achievement.displayName}
                loading="lazy"
              />
              <div className="achievements__card-points">
                {achievement.points != undefined ? (
                  <div
                    className="achievements__card-points-inner"
                    title={t("achievement_earn_points", {
                      points: achievement.points,
                    })}
                  >
                    <HydraIcon className="achievements__card-points-icon" />
                    <p className="achievements__card-points-value">
                      {achievement.points}
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => showHydraCloudModal("achievements")}
                    className="achievements__card-points-inner achievements__card-points-inner--locked"
                    title={t("achievement_earn_points", { points: "???" })}
                  >
                    <HydraIcon className="achievements__card-points-icon" />
                    <p className="achievements__card-points-value">???</p>
                  </button>
                )}
              </div>
            </div>

            <div className="achievements__card-content">
              <h4 className="achievements__card-title">
                {achievement.hidden && (
                  <span
                    className="achievements__card-hidden-icon"
                    title={t("hidden_achievement_tooltip")}
                  >
                    <EyeClosedIcon size={12} />
                  </span>
                )}
                {achievement.displayName}
              </h4>
              <p className="achievements__card-desc">
                {achievement.description}
              </p>
            </div>

            {achievement.unlockTime != null && (
              <div className="achievements__card-footer">
                <small className="achievements__card-date">
                  {formatDateTime(achievement.unlockTime)}
                </small>
              </div>
            )}
          </li>
        ))}
        {filteredAchievements.length === 0 && (
          <div className="achievements__empty-state">
            <p>
              {t("no_achievements_found", {
                defaultValue: "Nenhuma conquista encontrada.",
              })}
            </p>
          </div>
        )}
      </ul>
    </div>
  );
}
