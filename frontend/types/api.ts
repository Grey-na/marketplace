export type ApiResponse<T> = {
  result: T;
  message: string;
  pagination?: { page: number; count: number; limit: number; totalPages: number };
};

export type CategoryLite = { _id: string; title: string; slug: string; color?: string };
export type ShopLite = { _id: string; name: string; slug: string; logo?: { url: string } | null; isVerified?: boolean };

// a product as it appears on a card (prices are in paisa)
export type ProductCardData = {
  _id: string;
  slug: string;
  title: string;
  price: number;
  afterDiscount: number;
  discount: number;
  stock: number;
  images: { url: string }[];
  category: CategoryLite | null;
  shop: ShopLite | null;
  reason?: string;          // why we show it: trending, fresh_find, hidden_gem, similar ...
};