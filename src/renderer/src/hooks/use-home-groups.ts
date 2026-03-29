import { useState, useEffect, useCallback } from "react";

export interface HomeGroup {
  id: string;
  name: string;
  gameIds: string[];
}

export function useHomeGroups() {
  const [groups, setGroups] = useState<HomeGroup[]>([]);

  useEffect(() => {
    const savedGroups = localStorage.getItem("hydra:home-groups");
    if (savedGroups) {
      try {
        setGroups(JSON.parse(savedGroups));
      } catch (e) {
        console.error("Failed to parse home groups", e);
      }
    }
  }, []);

  const saveGroups = useCallback((newGroups: HomeGroup[]) => {
    localStorage.setItem("hydra:home-groups", JSON.stringify(newGroups));
    setGroups(newGroups);
  }, []);

  const createGroup = useCallback(
    (name: string, initialGameIds?: string | string[]) => {
      const gIds = Array.isArray(initialGameIds) ? initialGameIds : (initialGameIds ? [initialGameIds] : []);
      const newGroup: HomeGroup = {
        id: crypto.randomUUID(),
        name,
        gameIds: gIds,
      };
      saveGroups([...groups, newGroup]);
    },
    [groups, saveGroups]
  );

  const renameGroup = useCallback(
    (groupId: string, newName: string) => {
      saveGroups(
        groups.map((g) => {
          if (g.id === groupId) {
            return { ...g, name: newName };
          }
          return g;
        })
      );
    },
    [groups, saveGroups]
  );
  
  const updateGroup = useCallback(
    (groupId: string, newName: string, newGameIds: string[]) => {
      saveGroups(
        groups.map((g) => {
          if (g.id === groupId) {
            return { ...g, name: newName, gameIds: newGameIds };
          }
          // Remove from other groups
          if (g.id !== groupId && g.gameIds.some(id => newGameIds.includes(id))) {
             return { ...g, gameIds: g.gameIds.filter(id => !newGameIds.includes(id)) };
          }
          return g;
        })
      );
    },
    [groups, saveGroups]
  );

  const addGameToGroup = useCallback(
    (groupId: string, gameId: string) => {
      saveGroups(
        groups.map((g) => {
          if (g.id === groupId && !g.gameIds.includes(gameId)) {
            return { ...g, gameIds: [...g.gameIds, gameId] };
          }
          // Remove game from other groups if it's already in one? 
          // PS5 typically only allows a game in one folder at a time on home screen.
          if (g.id !== groupId && g.gameIds.includes(gameId)) {
             return { ...g, gameIds: g.gameIds.filter(id => id !== gameId) };
          }
          return g;
        })
      );
    },
    [groups, saveGroups]
  );

  const removeGameFromGroup = useCallback(
    (groupId: string, gameId: string) => {
      saveGroups(
        groups.map((g) => {
          if (g.id === groupId) {
            return { ...g, gameIds: g.gameIds.filter((id) => id !== gameId) };
          }
          return g;
        })
      );
    },
    [groups, saveGroups]
  );

  const deleteGroup = useCallback(
    (groupId: string) => {
      saveGroups(groups.filter((g) => g.id !== groupId));
    },
    [groups, saveGroups]
  );

  return {
    groups,
    createGroup,
    addGameToGroup,
    removeGameFromGroup,
    deleteGroup,
    renameGroup,
    updateGroup,
  };
}
