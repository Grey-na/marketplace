import HeaderBar from "./HeaderBar";
import { apiGet } from "@/lib/api";
import type { CategoryLite } from "@/types/api";

export default async function Header() {
  let categories: CategoryLite[] = [];
  try {
    categories = (await apiGet<CategoryLite[]>("/categories/home?limit=8", { revalidate: 60 })).result;
  } catch {
    // the header must never break a page
  }
  return <HeaderBar categories={categories} />;
}