import { registerEvent } from "../register-event";
import { db, levelKeys } from "@main/level";
import type { UserPreferences, SupabaseConfig } from "@types";
import {
  runLibraryMigration,
  validateSupabaseConnection,
  setActiveSupabaseConfig,
} from "@main/services/supabase-library";

const connectSupabase = async (
  _event: Electron.IpcMainInvokeEvent,
  config: SupabaseConfig
): Promise<{ ok: boolean; error?: string }> => {
  try {
    const { ok, error } = await validateSupabaseConnection(config);
    if (!ok) return { ok: false, error };

    await runLibraryMigration(config);
    setActiveSupabaseConfig(config);

    const prefs = await db.get<string, UserPreferences | null>(
      levelKeys.userPreferences,
      { valueEncoding: "json" }
    );

    await db.put<string, UserPreferences>(
      levelKeys.userPreferences,
      { ...prefs, supabaseConfig: config, libraryStorageMode: "supabase" },
      { valueEncoding: "json" }
    );

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: message };
  }
};

const disconnectSupabase = async (
  _event: Electron.IpcMainInvokeEvent
): Promise<void> => {
  setActiveSupabaseConfig(null);

  const prefs = await db.get<string, UserPreferences | null>(
    levelKeys.userPreferences,
    { valueEncoding: "json" }
  );

  await db.put<string, UserPreferences>(
    levelKeys.userPreferences,
    { ...prefs, supabaseConfig: null, libraryStorageMode: "local" },
    { valueEncoding: "json" }
  );
};

const checkSupabaseConnection = async (
  _event: Electron.IpcMainInvokeEvent,
  config: SupabaseConfig
): Promise<{ ok: boolean; error?: string }> => {
  return validateSupabaseConnection(config);
};

const setLibraryStorageMode = async (
  _event: Electron.IpcMainInvokeEvent,
  mode: "local" | "supabase"
): Promise<void> => {
  const prefs = await db.get<string, UserPreferences | null>(
    levelKeys.userPreferences,
    { valueEncoding: "json" }
  );

  await db.put<string, UserPreferences>(
    levelKeys.userPreferences,
    { ...prefs, libraryStorageMode: mode },
    { valueEncoding: "json" }
  );
};

registerEvent("connectSupabase", connectSupabase);
registerEvent("disconnectSupabase", disconnectSupabase);
registerEvent("checkSupabaseConnection", checkSupabaseConnection);
registerEvent("setLibraryStorageMode", setLibraryStorageMode);
