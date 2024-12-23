declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_WORDPRESS_API_URL: string;
    NODE_ENV: 'development' | 'production' | 'test';
    // Add other environment variables as needed
  }
} 