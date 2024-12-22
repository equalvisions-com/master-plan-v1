declare module '@vercel/kv' {
  export interface KVOptions {
    ex?: number;
    nx?: boolean;
  }

  export interface KV {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, options?: KVOptions): Promise<void>;
    del(key: string): Promise<void>;
  }

  export const kv: KV;
} 