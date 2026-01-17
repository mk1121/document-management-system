declare module 'oracledb' {
  export interface ConnectionAttributes {
    user?: string;
    password?: string;
    connectString?: string;
    poolMax?: number;
    poolMin?: number;
  }

  export interface Connection {
    execute(sql: string, params?: any, options?: any): Promise<any>;
    close(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
  }

  export interface Pool {
    getConnection(): Promise<Connection>;
  }

  export function getConnection(config: ConnectionAttributes): Promise<Connection>;
  export function createPool(config: ConnectionAttributes): Promise<Pool>;

  export const OUT_FORMAT_OBJECT: number;
  export const BUFFER: number;
  export const STRING: number;
  export const NUMBER: number;
  export const BIND_OUT: number;
  export const BIND_IN: number;
}
