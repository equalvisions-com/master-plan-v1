type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogMessage {
  message: string;
  data?: unknown;
  timestamp: string;
  level: LogLevel;
}

export const logger = {
  info: (message: string, data?: unknown) => log('info', message, data),
  warn: (message: string, data?: unknown) => log('warn', message, data),
  error: (message: string, data?: unknown) => log('error', message, data),
  debug: (message: string, data?: unknown) => log('debug', message, data),
};

function log(level: LogLevel, message: string, data?: unknown) {
  const logMessage: LogMessage = {
    message,
    data,
    timestamp: new Date().toISOString(),
    level,
  };

  if (process.env.NODE_ENV === 'development') {
    console[level](logMessage);
  }
  // Add production logging service integration here
} 