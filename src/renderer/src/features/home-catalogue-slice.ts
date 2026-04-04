import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

import type { ShopAssets } from "@types";
import { CatalogueCategory } from "@shared";

export interface HomeCatalogueState {
  catalogue: Record<CatalogueCategory, ShopAssets[]>;
  isMyGames: boolean;
  currentCategory: CatalogueCategory;
}

const initialState: HomeCatalogueState = {
  catalogue: {
    [CatalogueCategory.Hot]: [],
    [CatalogueCategory.Weekly]: [],
    [CatalogueCategory.Achievements]: [],
  },
  isMyGames: true,
  currentCategory: CatalogueCategory.Hot,
};

export const homeCatalogueSlice = createSlice({
  name: "homeCatalogue",
  initialState,
  reducers: {
    setCatalogueCategory: (
      state,
      action: PayloadAction<{
        category: CatalogueCategory;
        games: ShopAssets[];
      }>
    ) => {
      state.catalogue[action.payload.category] = action.payload.games;
    },
    setIsMyGames: (state, action: PayloadAction<boolean>) => {
      state.isMyGames = action.payload;
    },
    setCurrentCategory: (state, action: PayloadAction<CatalogueCategory>) => {
      state.currentCategory = action.payload;
    },
  },
});

export const { setCatalogueCategory, setIsMyGames, setCurrentCategory } = homeCatalogueSlice.actions;
