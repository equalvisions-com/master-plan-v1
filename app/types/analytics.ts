export interface AnalyticsProps {
  message: string;
  error?: string;
  url?: string;
  method?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
} 