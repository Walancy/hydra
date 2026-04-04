import { useState } from "react";
import type {
  ElementStyle,
  CustomThemeConfig,
} from "@renderer/services/theme-customizer.service";
import { BackgroundEffectSettings } from "../background-effect-settings";
import { SelectField } from "@renderer/components";
import { Toggle } from "@renderer/components";

const FONTS = [
  // Sans-serif modernas
  "Poppins",
  "Inter",
  "Outfit",
  "Raleway",
  "Nunito",
  "DM Sans",
  "Space Grotesk",
  "Syne",
  "Manrope",
  "Plus Jakarta Sans",
  "Urbanist",
  "Figtree",
  "Mulish",
  "Quicksand",
  "Jost",
  // Display
  "Bebas Neue",
  "Righteous",
  "Exo 2",
  "Orbitron",
  "Russo One",
  // Mono
  "JetBrains Mono",
  "Fira Code",
  "IBM Plex Mono",
];

interface SliderProps {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly unit?: string;
  readonly onChange: (v: number) => void;
}

export function CtrlSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: SliderProps) {
  return (
    <div className="cz__prop">
      <label className="cz__prop-label">{label}</label>
      <div className="cz__prop-row">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          aria-label={label}
        />
        <span className="cz__prop-val">
          {value}
          {unit}
        </span>
      </div>
    </div>
  );
}

interface ColorProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (v: string) => void;
}

export function CtrlColor({ label, value, onChange }: ColorProps) {
  return (
    <div className="cz__prop">
      <label className="cz__prop-label">{label}</label>
      <div className="cz__prop-row">
        <input
          type="color"
          value={value.startsWith("rgba") ? "#ffffff" : value.substring(0, 7)}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="cz__color-input"
        />
        <span className="cz__prop-val">{value}</span>
      </div>
    </div>
  );
}

// ── Global section ─────────────────────────────────────────────────────────────
interface GlobalProps {
  readonly value: CustomThemeConfig["global"];
  readonly onChange: (v: CustomThemeConfig["global"]) => void;
}

export function GlobalSection({ value, onChange }: GlobalProps) {
  const fontOptions = FONTS.map((f) => ({ key: f, value: f, label: f }));

  return (
    <div className="cz__section">
      <p className="cz__section-title">Global</p>
      <div className="cz__section-body">
        <CtrlSlider
          label="Border Radius"
          value={value.borderRadius}
          min={0}
          max={24}
          unit="px"
          onChange={(v) => onChange({ ...value, borderRadius: v })}
        />
        <div className="cz__prop">
          <SelectField
            label="Fonte"
            value={value.font}
            options={fontOptions}
            onChange={(e) => onChange({ ...value, font: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

// ── Element section (buttons / cards) ──────────────────────────────────────────
interface ElementProps {
  readonly title: string;
  readonly value: ElementStyle;
  readonly onChange: (v: ElementStyle) => void;
}

export function ElementSection({ title, value, onChange }: ElementProps) {
  const set = (patch: Partial<ElementStyle>) =>
    onChange({ ...value, ...patch });
  return (
    <div className="cz__section">
      <p className="cz__section-title">{title}</p>
      <div className="cz__section-grid">
        <CtrlSlider
          label="Border Radius"
          value={value.borderRadius}
          min={0}
          max={100}
          unit="px"
          onChange={(v) => set({ borderRadius: v })}
        />
        <CtrlSlider
          label="Borda (px)"
          value={value.borderWidth}
          min={0}
          max={4}
          onChange={(v) => set({ borderWidth: v })}
        />
        <CtrlSlider
          label="Opacidade fundo"
          value={value.bgOpacity}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => set({ bgOpacity: v })}
        />
        <CtrlSlider
          label="Blur (px)"
          value={value.blur}
          min={0}
          max={32}
          unit="px"
          onChange={(v) => set({ blur: v })}
        />
        <CtrlColor
          label="Cor da borda"
          value={value.borderColor}
          onChange={(v) => set({ borderColor: v })}
        />
        <CtrlColor
          label="Cor do fundo"
          value={value.bgColor}
          onChange={(v) => set({ bgColor: v })}
        />
      </div>
    </div>
  );
}

// ── Background section ─────────────────────────────────────────────────────────
interface BgProps {
  readonly value: CustomThemeConfig["background"];
  readonly onChange: (v: CustomThemeConfig["background"]) => void;
  readonly globalValue: CustomThemeConfig["global"];
  readonly onGlobalChange: (v: CustomThemeConfig["global"]) => void;
}

export function BackgroundSection({
  value,
  onChange,
  globalValue,
  onGlobalChange,
}: BgProps) {
  const [urlDraft, setUrlDraft] = useState(
    value.mediaUrl?.startsWith("http") ? value.mediaUrl : ""
  );

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = (file as File & { path?: string }).path;
    if (path) {
      onChange({ ...value, mediaUrl: `local:${path}` });
    } else {
      const reader = new FileReader();
      reader.onload = (ev) =>
        onChange({ ...value, mediaUrl: ev.target?.result as string });
      reader.readAsDataURL(file);
    }
    setUrlDraft("");
  };

  const handleUrlChange = (url: string) => {
    setUrlDraft(url);
    if (!url.trim()) {
      onChange({ ...value, mediaUrl: "" });
    } else {
      onChange({ ...value, mediaUrl: url.trim() });
    }
  };

  const hasPreview =
    value.mediaUrl &&
    (value.mediaUrl.startsWith("http") ||
      value.mediaUrl.startsWith("data:") ||
      value.mediaUrl.startsWith("local:"));

  return (
    <div className="cz__section">
      <p className="cz__section-title">Fundo</p>
      <div className="cz__section-body">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div className="cz__bg-toggle">
            {(["effect", "media"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`cz__bg-tab ${value.type === t ? "cz__bg-tab--active" : ""}`}
                onClick={() => onChange({ ...value, type: t })}
              >
                {t === "effect" ? "Efeito Animado" : "Imagem / GIF"}
              </button>
            ))}
          </div>

          <div
            className="cz__prop cz__prop-row cz__prop-toggle"
            style={{ margin: 0, padding: 0 }}
          >
            <span
              className="cz__prop-label"
              style={{ margin: 0, fontSize: "14px", display: "inline-block" }}
            >
              Usar fundo no Início
            </span>
            <Toggle
              checked={globalValue.useGameBackground === false}
              onChange={(enabled) =>
                onGlobalChange({ ...globalValue, useGameBackground: !enabled })
              }
            />
          </div>
        </div>

        {value.type === "effect" ? (
          <BackgroundEffectSettings />
        ) : (
          <div className="cz__media-picker">
            {/* URL input */}
            <div className="cz__prop">
              <label className="cz__prop-label" htmlFor="cz-media-url">
                URL (imagem ou GIF)
              </label>
              <input
                id="cz-media-url"
                type="url"
                className="cz__url-input"
                placeholder="https://exemplo.com/fundo.jpg"
                value={urlDraft}
                onChange={(e) => handleUrlChange(e.target.value)}
              />
            </div>

            <span className="cz__media-or">ou selecione um arquivo</span>

            {/* File picker */}
            <label className="cz__media-label" htmlFor="cz-media-file">
              {hasPreview && !urlDraft
                ? "Trocar arquivo"
                : "Selecionar imagem ou GIF"}
              <input
                id="cz-media-file"
                type="file"
                accept="image/*,.gif"
                className="cz__media-input"
                onChange={handleFile}
              />
            </label>

            {/* Preview */}
            {hasPreview && (
              <div className="cz__media-preview">
                <img src={value.mediaUrl} alt="Fundo" />
                <button
                  type="button"
                  className="cz__media-clear"
                  onClick={() => {
                    onChange({ ...value, mediaUrl: "" });
                    setUrlDraft("");
                  }}
                  aria-label="Remover mídia"
                >
                  Remover
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
