type CacheEntry = { value: unknown; expires: number };

const store = new Map<string, CacheEntry>();
const running = new Map<string, Promise<unknown>>();
const MAX_KEYS = 500;

/**
 * @description Keep the result of an expensive job in memory for a while.
 * If ten requests ask at the same moment, the job runs only once
 */
export const remember = async <T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> => {
    const hit = store.get(key);
    if(hit && hit.expires > Date.now()){
        return hit.value as T;
    }

    const inFlight = running.get(key);
    if(inFlight){
        return inFlight as Promise<T>;
    }

    const promise = loader()
        .then((value) => {
            if(store.size >= MAX_KEYS){
                store.clear()      // simple protection against growing without limit
            }
            store.set(key, { value: value, expires: Date.now() + ttlMs })
            return value;
        })
        .finally(() => running.delete(key));

    running.set(key, promise)
    return promise;
}

export const clearCache = () => store.clear();