const FAVORITES_KEY = 'favorite_product_ids';

const parseIds = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((id) => Number.parseInt(id, 10))
      .filter((id) => Number.isInteger(id) && id > 0);
  } catch {
    return [];
  }
};

export const getFavoriteProductIds = () => {
  if (typeof window === 'undefined') return [];
  return parseIds(window.localStorage.getItem(FAVORITES_KEY));
};

export const isFavoriteProduct = (productId) => {
  const normalizedId = Number.parseInt(productId, 10);
  if (!Number.isInteger(normalizedId)) return false;
  return getFavoriteProductIds().includes(normalizedId);
};

export const toggleFavoriteProduct = (productId) => {
  const normalizedId = Number.parseInt(productId, 10);
  if (!Number.isInteger(normalizedId)) {
    return { isFavorite: false, favoriteIds: getFavoriteProductIds() };
  }

  const current = getFavoriteProductIds();
  const alreadyFavorite = current.includes(normalizedId);
  const next = alreadyFavorite
    ? current.filter((id) => id !== normalizedId)
    : [...current, normalizedId];

  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('favorites:changed', { detail: next }));

  return { isFavorite: !alreadyFavorite, favoriteIds: next };
};
