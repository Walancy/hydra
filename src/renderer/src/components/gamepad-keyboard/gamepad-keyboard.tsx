import { useCallback } from "react";
import { useGamepad } from "@renderer/hooks/use-gamepad";
import { GamepadHint } from "../gamepad-hint/gamepad-hint";
import "./gamepad-keyboard.scss";

const ROWS: string[][] = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "⌫"],
  ["Z", "X", "C", "V", "B", "N", "M", "SPACE", "↵"],
];

const KEY_WIDTHS: Record<string, string> = {
  SPACE: "wider",
  "⌫": "wide",
  "↵": "wide",
};

interface GamepadKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  row: number;
  col: number;
  onRowChange: (r: number) => void;
  onColChange: (c: number) => void;
}

export function GamepadKeyboard({
  value,
  onChange,
  onClose,
  row,
  col,
  onRowChange,
  onColChange,
}: GamepadKeyboardProps) {
  const currentRow = ROWS[row];
  const safeCol = Math.min(col, currentRow.length - 1);

  const pressKey = useCallback(
    (key: string) => {
      if (key === "⌫") {
        onChange(value.slice(0, -1));
      } else if (key === "↵" || key === "SPACE") {
        onChange(value + (key === "SPACE" ? " " : "\n"));
      } else {
        onChange(value + key.toLowerCase());
      }
    },
    [value, onChange]
  );

  useGamepad({
    priority: 20,
    onButton: {
      DPAD_UP: () => {
        onRowChange(Math.max(0, row - 1));
        return true;
      },
      DPAD_DOWN: () => {
        onRowChange(Math.min(ROWS.length - 1, row + 1));
        return true;
      },
      DPAD_LEFT: () => {
        onColChange(Math.max(0, safeCol - 1));
        return true;
      },
      DPAD_RIGHT: () => {
        onColChange(Math.min(ROWS[row].length - 1, safeCol + 1));
        return true;
      },
      A: () => {
        pressKey(ROWS[row][safeCol]);
        return true;
      },
      B: () => {
        onClose();
        return true;
      },
      X: () => {
        onChange(value.slice(0, -1));
        return true;
      },
    },
  });

  return (
    <div className="gamepad-keyboard" data-gamepad-ignore="true">
      <div className="gamepad-keyboard__rows">
        {ROWS.map((keys, r) => (
          <div key={r} className="gamepad-keyboard__row">
            {keys.map((key, c) => {
              const isFocused = r === row && c === safeCol;
              const widthClass = KEY_WIDTHS[key]
                ? `gamepad-keyboard__key--${KEY_WIDTHS[key]}`
                : "";
              return (
                <button
                  key={key}
                  type="button"
                  tabIndex={-1}
                  className={[
                    "gamepad-keyboard__key",
                    widthClass,
                    isFocused ? "gamepad-keyboard__key--focused" : "",
                    key.length > 1 ? "gamepad-keyboard__key--special" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => pressKey(key)}
                >
                  {key === "SPACE" ? "Espaço" : key}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="gamepad-keyboard__hint">
        <span>
          <GamepadHint label="A" position="left" />
          digitar
        </span>
        <span>
          <GamepadHint label="B" position="left" />
          apagar
        </span>
        <span>
          <GamepadHint label="X" position="left" />
          confirmar
        </span>
      </div>
    </div>
  );
}
