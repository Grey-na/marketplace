export type ApiResponse<T> = {
  result: T;
  message: string;
  pagination?: { page: number; count: number; limit: number; totalPages: number };
};

export type CategoryLite = { _id: string; title: string; slug: string; color?: string; image?: { url: string } | null };
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

// a shop as it appears on a shop card
export type ShopCardData = {
  _id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo?: { url: string } | null;
  cover?: { url: string } | null;
  isVerified?: boolean;
  followerCount: number;
  ratingAvg: number;
  ratingCount: number;
};

export type UserRole = "admin" | "customer" | "seller";

export type User = {
  _id: string;
  fullName: string;
  username: string;      // the email
  role: UserRole;
  phone?: string;
  status?: string;
};