export interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
}

export interface Variables {
  userId: string;
}

export type AppEnv = { Bindings: Env; Variables: Variables };
