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

// a whole product, for the product page
export type ProductDetailData = ProductCardData & {
  summary: string;
  description?: string | null;
  brand?: string | null;
  tags: string[];
  attributes: { name: string; values: string[] }[];
  highlights: string[];
  shippingPolicy?: string | null;
  returnPolicy?: string | null;
  shop: ShopCardData | null;
};

export type ReviewData = {
  _id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  user: { fullName: string } | null;
};

export type ReviewsResult = { ratingAvg: number; ratingCount: number; reviews: ReviewData[] };

// a whole shop, for the shop page
export type ShopDetailData = ShopCardData & {
  contact?: { phone?: string | null; email?: string | null; address?: string | null };
  createdAt?: string;
  isFeatured?: boolean;
};

export type CartLine = {
  productId: string;
  title: string;
  slug: string | null;
  image: string | null;
  shop: { _id: string; name: string; slug: string } | null;
  unitPrice: number;
  originalPrice: number;
  discount: number;
  quantity: number;
  stock: number;
  lineTotal: number;
  problem: string | null;        // unavailable, out_of_stock, not_enough_stock, or null when fine
};

export type CartView = {
  items: CartLine[];
  itemCount: number;
  hasProblems: boolean;
  shopCount: number;
  subtotal: number;
  deliveryCharge: number;
  total: number;
};

export type Address = { fullName: string; phone: string; city: string; street: string; landmark?: string | null };

export type ParcelItem = {
  product: string;
  title: string;
  slug?: string;
  image?: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

// the part of an order that one shop prepares and sends
export type Parcel = {
  _id: string;
  status: string;
  subtotal: number;
  deliveryCharge: number;
  total: number;
  shop: { _id: string; name: string; slug: string } | null;
  items: ParcelItem[];
  shipment?: { provider?: string; trackingNo?: string | null; status?: string | null };
  timeline?: { status: string; at: string; note?: string | null }[];
  refund?: { status: string; amount: number };
};

export type OrderData = {
  _id: string;
  orderNo: string;
  status: string;
  createdAt: string;
  address: Address;
  note?: string | null;
  subtotal: number;
  deliveryCharge: number;
  total: number;
  payment: { method: string; status: string; txnId?: string | null };
  shopOrders: Parcel[];
};

export type OrderSummary = {
  _id: string;
  orderNo: string;
  status: string;
  createdAt: string;
  total: number;
  payment: { method: string; status: string };
  shopOrders: Array<{
    _id: string;
    status: string;
    total: number;
    shop: { name: string; slug: string } | null;
    items: { title: string; image?: string | null; quantity: number }[];
  }>;
};

export type MyReview = { _id: string; product: string; rating: number; comment?: string | null };