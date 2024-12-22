interface Logger {
  error: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
}

class CustomLogger implements Logger {
  error(message: string, ...args: any[]) {
    console.error(message, ...args);
  }

  warn(message: string, ...args: any[]) {
    console.warn(message, ...args);
  }

  info(message: string, ...args: any[]) {
    console.info(message, ...args);
  }

  debug(message: string, ...args: any[]) {
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG === 'true') {
      console.debug(message, ...args);
    }
  }
}

export const logger: Logger = new CustomLogger(); 