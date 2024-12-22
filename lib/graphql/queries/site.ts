import { gql } from '@apollo/client';

export const getSiteSettings = gql`
  query SiteSettings {
    seo {
      schema {
        companyName
        companyLogo {
          altText
          sourceUrl
          srcSet
        }
        inLanguage
        siteName
        siteUrl
      }
    }
  }
`; 