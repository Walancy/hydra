import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Modal, TextField, Button } from "@renderer/components";
import type { ShopAssets } from "@types";
import { CheckCircleFillIcon } from "@primer/octicons-react";

export interface CreateFolderModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, gameIds: string[]) => void;
  games: ShopAssets[];
  initialName?: string;
  initialSelectedIds?: string[];
}

export function CreateFolderModal({
  visible,
  onClose,
  onCreate,
  games,
  initialName = "",
  initialSelectedIds = [],
}: Readonly<CreateFolderModalProps>) {
  const { t } = useTranslation("home");
  const [name, setName] = useState(initialName);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setSelectedIds(initialSelectedIds);
    }
  }, [visible, initialName, initialSelectedIds]);

  const toggleGame = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    if (name.trim()) {
      onCreate(name.trim(), selectedIds);
      setName("");
      setSelectedIds([]);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      title={
        initialName
          ? t("editar_pasta", { defaultValue: "Editar Pasta" })
          : t("criar_pasta", { defaultValue: "Criar Pasta" })
      }
      onClose={onClose}
      large
      className="create-folder-modal"
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          height: "70vh",
          width: "100%",
        }}
      >
        {!initialName && (
          <TextField
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("nome_da_pasta", { defaultValue: "Nome da pasta" })}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
        )}

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
            gap: 16,
            paddingRight: 8,
          }}
        >
          {games.map((game) => (
            <button
              key={game.objectId}
              onClick={() => toggleGame(game.objectId)}
              style={{
                position: "relative",
                display: "block",
                width: "100%",
                aspectRatio: "2/3",
                borderRadius: 8,
                overflow: "hidden",
                border: selectedIds.includes(game.objectId)
                  ? "2px solid #5227ff"
                  : "2px solid transparent",
                background: "rgba(255, 255, 255, 0.05)",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <img
                src={
                  game.shop === "steam"
                    ? `https://steamcdn-a.akamaihd.net/steam/apps/${game.objectId}/library_600x900_2x.jpg`
                    : (game.libraryImageUrl ?? undefined)
                }
                alt={game.title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transition: "opacity 0.2s ease",
                  opacity: selectedIds.includes(game.objectId) ? 0.35 : 1,
                }}
              />
              {selectedIds.includes(game.objectId) && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                  }}
                >
                  <CheckCircleFillIcon size={48} />
                </div>
              )}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: "auto",
          }}
        >
          <Button theme="outline" onClick={onClose}>
            {t("cancel", { defaultValue: "Cancelar" })}
          </Button>
          <Button theme="primary" disabled={!name.trim()} onClick={handleSave}>
            {t("save", { defaultValue: "Salvar" })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
