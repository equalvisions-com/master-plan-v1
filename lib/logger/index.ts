export interface Logger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
}

export const logger: Logger = {
  debug: (message: string, ...args: any[]) => {
    console.debug(message, ...args);
  },
  info: (message: string, ...args: any[]) => {
    console.info(message, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(message, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(message, ...args);
  }
}; 