import { useState, useEffect } from "react";
import "./background-effect-settings.scss";

// Reusing Hydra select, input or standard HTML
import { TextField, Button } from "@renderer/components";

export const effectsInfo: Record<
  string,
  { label: string; defaults: any; info: string }
> = {
  none: { label: "Nenhum", defaults: {}, info: "Sem fundo animado" },
  darkveil: {
    label: "Dark Veil",
    defaults: {
      hueShift: 0,
      noiseIntensity: 0,
      scanlineIntensity: 0,
      speed: 0.5,
      scanlineFrequency: 0,
      warpAmount: 0,
    },
    info: "Neblina etérea e fluida com ajustes de matiz e scanlines",
  },
  lightpillar: {
    label: "Light Pillar",
    defaults: {
      topColor: "#5227FF",
      bottomColor: "#FF9FFC",
      intensity: 1,
      rotationSpeed: 0.3,
      glowAmount: 0.002,
      pillarWidth: 3,
      pillarHeight: 0.4,
      noiseIntensity: 0.5,
      pillarRotation: 25,
      interactive: false,
    },
    info: "Pilar de luz luminoso e expansível",
  },
  floatinglines: {
    label: "Floating Lines",
    defaults: {
      linesGradient: ["#a5cfaa", "#273f3b"],
      lineCount: 5,
      lineDistance: 5,
      bendRadius: 5,
      bendStrength: -0.5,
      interactive: true,
      parallax: true,
    },
    info: "Linhas flutuantes responsivas ao mouse",
  },
  lightrays: {
    label: "Light Rays",
    defaults: {
      raysOrigin: "top-center",
      raysColor: "#ffffff",
      raysSpeed: 1,
      lightSpread: 0.5,
      rayLength: 3,
      followMouse: true,
      mouseInfluence: 0.1,
      noiseAmount: 0,
      distortion: 0,
      pulsating: false,
      fadeDistance: 1,
      saturation: 1,
    },
    info: "Raios de luz volumétricos projetados na tela",
  },
  colorbends: {
    label: "Color Bends",
    defaults: {
      colors: ["#ff5c7a", "#8a5cff", "#00ffd1"],
      rotation: 0,
      speed: 0.2,
      scale: 1,
      frequency: 1,
      warpStrength: 1,
      mouseInfluence: 1,
      parallax: 0.5,
      noise: 0.1,
      transparent: true,
      autoRotate: 0,
    },
    info: "Distorções coloridas fluidas com estilo gradiente mesh",
  },
  particles: {
    label: "Particles",
    defaults: {
      particleColors: ["#ffffff", "#ff0000", "#00ff00"],
      particleCount: 200,
      particleSpread: 10,
      speed: 0.1,
      particleBaseSize: 100,
      moveParticlesOnHover: true,
      alphaParticles: false,
      disableRotation: false,
    },
    info: "Nuvem de partículas 3D espaciais",
  },
  beams: {
    label: "Beams",
    defaults: {
      beamWidth: 3,
      beamHeight: 30,
      beamNumber: 20,
      lightColor: "#ffffff",
      speed: 2,
      noiseIntensity: 1.75,
      scale: 0.2,
      rotation: 30,
    },
    info: "Feixes de luz volumétricos 3D com ruído animado",
  },
  pixelblast: {
    label: "Pixel Blast",
    defaults: {
      color: "#07e874", // Color without ff so it doesn't break color inputs or sanitizers
      pixelSize: 3,
      patternScale: 3.5,
      patternDensity: 1.6,
      rippleSpeed: 0.3,
      rippleThickness: 0.07,
      rippleIntensityScale: 1.2,
      speed: 0.4,
      transparent: true,
      edgeFade: 0.4,
      enableRipples: true,
      variant: "square",
    },
    info: "Partículas pixeladas interativas (estilo Matrix)",
  },
};

export function BackgroundEffectSettings() {
  const [effect, setEffect] = useState<string>("none");
  const [config, setConfig] = useState<any>({});

  useEffect(() => {
    const ef =
      localStorage.getItem("hydra_background_effect") || "floatinglines";
    setEffect(ef);
    try {
      const confStr = localStorage.getItem("hydra_background_config");
      if (confStr) {
        setConfig(JSON.parse(confStr));
      } else {
        setConfig(effectsInfo["floatinglines"].defaults);
      }
    } catch {
      setConfig({});
    }
  }, []);

  const handleEffectChange = (newEffect: string) => {
    setEffect(newEffect);
    localStorage.setItem("hydra_background_effect", newEffect);

    // Set default config if empty
    let conf = config;
    if (newEffect !== "none" && (!config || Object.keys(config).length === 0)) {
      conf = effectsInfo[newEffect].defaults;
      setConfig(conf);
    } else {
      conf = effectsInfo[newEffect].defaults; // reset options to avoid breaking things with missing ones for now
      setConfig(conf);
    }

    localStorage.setItem("hydra_background_config", JSON.stringify(conf));
    window.dispatchEvent(new Event("background_effect_update"));
  };

  const handleConfigChange = (key: string, value: any) => {
    const newConf = { ...config, [key]: value };
    setConfig(newConf);
    localStorage.setItem("hydra_background_config", JSON.stringify(newConf));
    window.dispatchEvent(new Event("background_effect_update"));
  };

  const currentInfo = effectsInfo[effect];

  return (
    <div className="background-effect-settings">
      <div className="background-effect-settings__selectors">
        {Object.entries(effectsInfo).map(([key, info]) => (
          <Button
            key={key}
            theme={effect === key ? "primary" : "outline"}
            className="background-effect-settings__btn"
            onClick={() => handleEffectChange(key)}
          >
            {info.label}
          </Button>
        ))}
      </div>

      <div className="background-effect-settings__info">
        <h3>{currentInfo.label}</h3>
        <p>{currentInfo.info}</p>
      </div>

      {effect !== "none" && (
        <div className="background-effect-settings__config">
          {Object.entries(currentInfo.defaults).map(([key, defaultValue]) => {
            const val = config[key] !== undefined ? config[key] : defaultValue;
            const t = typeof defaultValue;

            if (t === "boolean") {
              return (
                <div
                  key={key}
                  className="background-effect-settings__prop background-effect-settings__prop--checkbox"
                >
                  <label>{key}</label>
                  <input
                    type="checkbox"
                    checked={val}
                    onChange={(e) => handleConfigChange(key, e.target.checked)}
                  />
                </div>
              );
            } else if (t === "number") {
              return (
                <div key={key} className="background-effect-settings__prop">
                  <label>{key}</label>
                  <input
                    type="range"
                    min={defaultValue === 0 ? -10 : 0}
                    max={Math.max((defaultValue as number) * 3, 100)}
                    step={
                      (defaultValue as number) % 1 !== 0 || defaultValue === 0
                        ? 0.05
                        : 1
                    }
                    value={val}
                    onChange={(e) =>
                      handleConfigChange(key, parseFloat(e.target.value))
                    }
                  />
                  <span>{val}</span>
                </div>
              );
            } else if (Array.isArray(defaultValue)) {
              const valArray = val as string[];
              const isColorArray =
                valArray.length > 0 && valArray[0].startsWith("#");

              if (isColorArray) {
                return (
                  <div key={key} className="background-effect-settings__prop">
                    <label>{key}</label>
                    <div className="background-effect-settings__color-array">
                      {valArray.map((color, index) => (
                        <div
                          key={index}
                          className="background-effect-settings__color-input"
                        >
                          <input
                            type="color"
                            value={color.substring(0, 7)}
                            onChange={(e) => {
                              const newArr = [...valArray];
                              newArr[index] = e.target.value;
                              handleConfigChange(key, newArr);
                            }}
                          />
                          <TextField
                            value={color}
                            onChange={(e) => {
                              const newArr = [...valArray];
                              newArr[index] = e.target.value;
                              handleConfigChange(key, newArr);
                            }}
                          />
                          <button
                            type="button"
                            className="background-effect-settings__remove-color"
                            onClick={() => {
                              const newArr = valArray.filter(
                                (_, i) => i !== index
                              );
                              if (newArr.length > 0)
                                handleConfigChange(key, newArr);
                            }}
                            title="Remover cor"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <Button
                        theme="outline"
                        className="background-effect-settings__add-color"
                        onClick={() => {
                          handleConfigChange(key, [...valArray, "#ffffff"]);
                        }}
                      >
                        + Adicionar Cor
                      </Button>
                    </div>
                  </div>
                );
              }

              // Support multiple values simply by comma separated string if not colors
              const valStr = valArray.join(", ");
              return (
                <div key={key} className="background-effect-settings__prop">
                  <label>{key} (separado por vírgula)</label>
                  <TextField
                    value={valStr}
                    onChange={(e) => {
                      const arr = e.target.value
                        .split(",")
                        .map((s) => s.trim());
                      handleConfigChange(key, arr);
                    }}
                  />
                </div>
              );
            } else if (t === "string") {
              const isColor = (defaultValue as string).startsWith("#");
              return (
                <div key={key} className="background-effect-settings__prop">
                  <label>{key}</label>
                  {isColor ? (
                    <div className="background-effect-settings__color-input">
                      <input
                        type="color"
                        value={val.substring(0, 7)} // HTML color picker doesn't support 8 digit hex
                        onChange={(e) =>
                          handleConfigChange(key, e.target.value)
                        }
                      />
                      <TextField
                        value={val}
                        onChange={(e) =>
                          handleConfigChange(key, e.target.value)
                        }
                      />
                    </div>
                  ) : (
                    <TextField
                      value={val}
                      onChange={(e) => handleConfigChange(key, e.target.value)}
                    />
                  )}
                </div>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}
