export interface SiteConfig {
  site: {
    name: string;
    url: string;
    description: string;
    themeColor: string;
    googleSiteVerification?: string;
    bingSiteVerification?: string;
    yandexSiteVerification?: string;
    locales: {
      [key: string]: string;
    };
  };
  social: {
    twitter: string;
    [key: string]: string;
  };
  cache?: {
    [key: string]: any;
  };
}

export const siteConfig: SiteConfig = {
  site: {
    name: 'Hampton Current',
    url: 'https://hamptoncurrent.com',
    description: 'Your site description',
    themeColor: '#000000',
    googleSiteVerification: process.env.GOOGLE_SITE_VERIFICATION,
    bingSiteVerification: process.env.BING_SITE_VERIFICATION,
    yandexSiteVerification: process.env.YANDEX_SITE_VERIFICATION,
    locales: {
      'en-US': 'https://hamptoncurrent.com',
    }
  },
  social: {
    twitter: '@HamptonCurrent',
  }
}; 