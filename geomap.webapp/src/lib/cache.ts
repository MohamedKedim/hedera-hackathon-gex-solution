interface CacheItem {
  data: any;
  timestamp: number;
  expires: number; // Cache expiration time in milliseconds
}

export class DataCache {
  private defaultExpiry = 24 * 60 * 60 * 1000; // 24 hours

  set(key: string, data: any, expires?: number): void {
    try {
      const item: CacheItem = {
        data,
        timestamp: Date.now(),
        expires: expires || this.defaultExpiry,
      };
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  get(key: string): any | null {
    try {
      const itemStr = localStorage.getItem(key);
      if (!itemStr) return null;
      const item: CacheItem = JSON.parse(itemStr);
      if (Date.now() - item.timestamp > item.expires) {
        localStorage.removeItem(key);
        return null;
      }
      return item.data;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }

  clear(): void {
    localStorage.clear();
  }

  cleanup(): void {
    try {
      Object.keys(localStorage).forEach((key) => {
        const itemStr = localStorage.getItem(key);
        if (itemStr) {
          const item: CacheItem = JSON.parse(itemStr);
          if (Date.now() - item.timestamp > item.expires) {
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.error('Error during cache cleanup:', error);
    }
  }
}

export const dataCache = new DataCache();