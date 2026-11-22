const KEY = "anon_id";

// a random id for a visitor who is not logged in. It stays in this browser, so the
// recommendations can learn what this visitor likes
export const getAnonId = (): string | null => {
  try {
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, "");   // 32 letters and digits, which the backend accepts
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return null;   // private mode, or storage is blocked: no personalization, but nothing breaks
  }
};