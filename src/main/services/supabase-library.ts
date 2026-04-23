import type { SupabaseConfig } from "@types";

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS hydra_home_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  game_ids TEXT[],
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE hydra_home_groups ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE hydra_home_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access" ON hydra_home_groups
FOR ALL USING (true) WITH CHECK (true);
`;

interface SupabaseResponse<T = unknown> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

export const supabaseFetch = async <T>(
  config: SupabaseConfig,
  path: string,
  options: RequestInit = {}
): Promise<SupabaseResponse<T>> => {
  let baseUrl = config.url.trim().replace(/\/$/, "");
  if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
    baseUrl = "https://" + baseUrl;
  }
  const url = `${baseUrl}/rest/v1${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return {
      data: null,
      error: { message: body?.message ?? res.statusText, code: body?.code },
    };
  }

  const text = await res.text();
  const data = text ? (JSON.parse(text) as T) : null;
  return { data, error: null };
};

const runMigrationViaRpc = async (config: SupabaseConfig): Promise<void> => {
  let baseUrl = config.url.trim().replace(/\/$/, "");
  if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
    baseUrl = "https://" + baseUrl;
  }
  const url = `${baseUrl}/rest/v1/rpc/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql: MIGRATION_SQL }),
  });

  if (!res.ok && res.status !== 404) {
    throw new Error(`RPC migration failed: ${res.status} ${res.statusText}`);
  }
};

let activeConfig: SupabaseConfig | null = null;

export const setActiveSupabaseConfig = (
  config: SupabaseConfig | null
): void => {
  activeConfig = config;
};

export const getActiveSupabaseConfig = (): SupabaseConfig | null =>
  activeConfig;

export const runLibraryMigration = async (
  config: SupabaseConfig
): Promise<void> => {
  const { error } = await supabaseFetch(config, "/hydra_home_groups?limit=1");

  if (!error) return;

  if (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.includes("does not exist") ||
    error.message?.includes("Could not find the table")
  ) {
    await runMigrationViaRpc(config);
    return;
  }

  if (error.code === "PGRST116" || error.code === "42501") {
    return;
  }

  throw new Error(`Migration failed: ${error.message}`);
};

export const validateSupabaseConnection = async (
  config: SupabaseConfig
): Promise<{ ok: boolean; error?: string }> => {
  try {
    let baseUrl = config.url.trim().replace(/\/$/, "");
    if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      baseUrl = "https://" + baseUrl;
    }
    // Using /hydra_home_groups?limit=1 instead of root since some setup restricts hitting the root API definition
    const url = `${baseUrl}/rest/v1/hydra_home_groups?limit=1`;
    console.log("Testing Supabase connection to:", url);
    const res = await fetch(url, {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
    });

    console.log("Supabase connection status:", res.status, res.statusText);

    if (res.status === 401)
      return { ok: false, error: "Chave da API (Anon Key) inválida" };
    if (
      res.status === 404 &&
      !res.headers.get("Content-Type")?.includes("json")
    ) {
      return { ok: false, error: "URL do Supabase inválida" };
    }
    // If it's 404 but returns JSON (PGRST205), it connected to PostgREST but table is missing, so it's a success
    if (!res.ok && res.status !== 404)
      return {
        ok: false,
        error: `Connection failed: ${res.status} ${res.statusText}`,
      };

    return { ok: true };
  } catch (err) {
    console.error("Supabase validation error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: `Network error: ${message}` };
  }
};

export interface CloudLibraryGame {
  id: string;
  title: string;
  shop: string;
  object_id: string;
  icon_url: string | null;
  cover_url: string | null;
  collections: string[];
}

export const syncGameToCloudLibrary = async (
  game: CloudLibraryGame
): Promise<void> => {
  if (!activeConfig) return;
  const { error } = await supabaseFetch(activeConfig, "/hydra_cloud_library", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(game),
  });

  if (error) {
    console.error("Failed to sync game to cloud library:", error);
  }
};

export const removeGameFromCloudLibrary = async (id: string): Promise<void> => {
  if (!activeConfig) return;
  const { error } = await supabaseFetch(
    activeConfig,
    `/hydra_cloud_library?id=eq.${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );

  if (error) {
    console.error("Failed to delete game from cloud library:", error);
  }
};
