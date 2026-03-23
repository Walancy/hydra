import { levelDatabasePath } from "@main/constants";
import { ClassicLevel } from "classic-level";

export const db = new ClassicLevel(levelDatabasePath, {
  valueEncoding: "json",
});

export const openDB = async () => {
  if (db.status === "closed") {
    await db.open();
  }
};
