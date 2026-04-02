import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

import type { ShopAssets } from "@types";
import { CatalogueCategory } from "@shared";

export interface HomeCatalogueState {
  catalogue: Record<CatalogueCategory, ShopAssets[]>;
}

const initialState: HomeCatalogueState = {
  catalogue: {
    [CatalogueCategory.Hot]: [],
    [CatalogueCategory.Weekly]: [],
    [CatalogueCategory.Achievements]: [],
  },
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
  },
});

export const { setCatalogueCategory } = homeCatalogueSlice.actions;
