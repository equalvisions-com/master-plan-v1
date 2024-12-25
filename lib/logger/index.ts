type LogArgs = string | number | boolean | null | undefined | Error | object;

export interface Logger {
  debug: (message: string, ...args: LogArgs[]) => void;
  info: (message: string, ...args: LogArgs[]) => void;
  warn: (message: string, ...args: LogArgs[]) => void;
  error: (message: string, ...args: LogArgs[]) => void;
}

export const logger: Logger = {
  debug: (message: string, ...args: LogArgs[]) => {
    console.debug(message, ...args);
  },
  info: (message: string, ...args: LogArgs[]) => {
    console.info(message, ...args);
  },
  warn: (message: string, ...args: LogArgs[]) => {
    console.warn(message, ...args);
  },
  error: (message: string, ...args: LogArgs[]) => {
    console.error(message, ...args);
  }
}; 