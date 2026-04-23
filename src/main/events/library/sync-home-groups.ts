import { registerEvent } from "../register-event";
import { db, levelKeys } from "@main/level";
import {
  supabaseFetch,
  getActiveSupabaseConfig,
} from "@main/services/supabase-library";
import type { UserPreferences } from "@types";

interface HomeGroup {
  id: string;
  name: string;
  gameIds: string[];
  is_deleted?: boolean;
}

const syncHomeGroups = async (
  _event: Electron.IpcMainInvokeEvent,
  groups: HomeGroup[]
) => {
  const prefs = await db
    .get<string, UserPreferences>(levelKeys.userPreferences)
    .catch(() => null);

  const activeConfig = getActiveSupabaseConfig() || prefs?.supabaseConfig;

  if (prefs?.libraryStorageMode === "supabase" && activeConfig) {
    const payloads = groups.map((g) => ({
      id: g.id,
      name: g.name,
      game_ids: g.gameIds,
      is_deleted: g.is_deleted ?? false,
    }));

    if (payloads.length > 0) {
      const { error } = await supabaseFetch(
        activeConfig,
        "/hydra_home_groups?on_conflict=id",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates",
          },
          body: JSON.stringify(payloads),
        }
      );
      if (error) {
        throw new Error("Supabase sync failed: " + error.message);
      }
    }
    return { status: "synced", provider: "supabase" };
  }
  return { status: "local_only", provider: "local" };
};

const fetchHomeGroups = async (
  _event: Electron.IpcMainInvokeEvent
): Promise<HomeGroup[] | null> => {
  const prefs = await db
    .get<string, UserPreferences>(levelKeys.userPreferences)
    .catch(() => null);

  const activeConfig = getActiveSupabaseConfig() || prefs?.supabaseConfig;

  if (prefs?.libraryStorageMode === "supabase" && activeConfig) {
    const { data, error } = await supabaseFetch<
      { id: string; name: string; game_ids: string[]; is_deleted?: boolean }[]
    >(activeConfig, "/hydra_home_groups", { method: "GET" });
    if (!error && Array.isArray(data)) {
      return data.map((g) => ({
        id: g.id,
        name: g.name,
        gameIds: g.game_ids || [],
        is_deleted: g.is_deleted ?? false,
      }));
    }
  }
  return null;
};

registerEvent("syncHomeGroups", syncHomeGroups);
registerEvent("fetchHomeGroups", fetchHomeGroups);
