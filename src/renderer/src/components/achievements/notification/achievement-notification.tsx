import {
  AchievementCustomNotificationPosition,
  AchievementNotificationInfo,
} from "@types";
import cn from "classnames";
import { EyeClosedIcon } from "@primer/octicons-react";
import trophySilver from "@renderer/assets/trophy/silver.png";
import trophyGold from "@renderer/assets/trophy/gold.png";
import trophyPlatinum from "@renderer/assets/trophy/platinum.png";
import "./achievement-notification.scss";

interface AchievementNotificationProps {
  position: AchievementCustomNotificationPosition;
  achievement: AchievementNotificationInfo;
  isClosing: boolean;
}

export function AchievementNotificationItem({
  position,
  achievement,
  isClosing,
}: Readonly<AchievementNotificationProps>) {
  const baseClassName = "achievement-notification";

  const trophySrc = achievement.isPlatinum
    ? trophyPlatinum
    : achievement.isRare
      ? trophyGold
      : trophySilver;

  return (
    <div
      className={cn("achievement-notification", {
        [`${baseClassName}--${position}`]: true,
        [`${baseClassName}--closing`]: isClosing,
        [`${baseClassName}--hidden`]: achievement.isHidden,
        [`${baseClassName}--rare`]: achievement.isRare,
        [`${baseClassName}--platinum`]: achievement.isPlatinum,
      })}
    >
      <div className="achievement-notification__outer-container">
        <div className="achievement-notification__container">
          <div className="achievement-notification__content">
            <img
              src={achievement.iconUrl}
              alt={achievement.title}
              className="achievement-notification__icon"
            />
            <div className="achievement-notification__text-container">
              <p className="achievement-notification__title">
                {achievement.isHidden && (
                  <span className="achievement-notification__hidden-icon">
                    <EyeClosedIcon size={13} />
                  </span>
                )}
                {achievement.title}
              </p>
              <p className="achievement-notification__description">
                {achievement.description}
              </p>
            </div>
            <div className="achievement-notification__trophy-wrapper">
              <img
                src={trophySrc}
                alt="trophy"
                className="achievement-notification__trophy"
              />
              {achievement.points !== undefined && (
                <span className="achievement-notification__chip">
                  +{achievement.points}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
