import React, { createContext, useContext, useEffect, useState } from 'react';
import { getLocalFavorites, saveFavorite } from '../services/cardStorage';
import { useAuth } from './AuthContext';

interface FavoritesContextType {
  favorites: string[];
  isFavorite: (templateId: string) => boolean;
  toggleFavorite: (templateId: string) => Promise<void>;
  count: number;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const list = getLocalFavorites();
    setFavorites(list);
  }, [user]);

  const isFavorite = (templateId: string) => favorites.includes(templateId);

  const toggleFavorite = async (templateId: string) => {
    const currentlyFav = favorites.includes(templateId);
    const updated = currentlyFav
      ? favorites.filter((id) => id !== templateId)
      : [...favorites, templateId];

    setFavorites(updated);
    await saveFavorite(templateId, !currentlyFav, user?.uid);
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isFavorite,
        toggleFavorite,
        count: favorites.length,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
