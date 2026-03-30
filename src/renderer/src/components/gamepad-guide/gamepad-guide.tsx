import { useTranslation } from "react-i18next";
import { GamepadHint } from "../gamepad-hint/gamepad-hint";
import "./gamepad-guide.scss";
import { useGamepadConnected } from "@renderer/hooks/use-gamepad";

export function GamepadGuide() {
  const { t } = useTranslation("home");
  const isGamepadConnected = useGamepadConnected();

  if (!isGamepadConnected) return null;

  return (
    <div className="gamepad-guide" data-gamepad-ignore="true">
      <div className="gamepad-guide__item">
        <GamepadHint label="A" position="left" />
        <span>{t("select", { defaultValue: "Selecionar" })}</span>
      </div>
      <div className="gamepad-guide__item">
        <GamepadHint label="B" position="left" />
        <span>{t("back", { defaultValue: "Voltar" })}</span>
      </div>
      <div className="gamepad-guide__item">
        <GamepadHint label="X" position="left" />
        <span>{t("search", { defaultValue: "Pesquisar" })}</span>
      </div>
      <div className="gamepad-guide__item">
        <GamepadHint label="Y" position="left" />
        <span>{t("profile", { defaultValue: "Perfil" })}</span>
      </div>
    </div>
  );
}
