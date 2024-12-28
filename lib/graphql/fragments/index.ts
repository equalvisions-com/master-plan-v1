import { gql } from '@apollo/client';

export const POST_FIELDS = gql`
  fragment PostFields on Post {
    id
    databaseId
    title
    slug
    date
    excerpt
    content
    featuredImage {
      node {
        sourceUrl
        altText
      }
    }
    categories {
      nodes {
        id
        name
        slug
      }
    }
  }
`;

export const POST_META_FIELDS = gql`
  fragment PostMetaFields on Post {
    seo {
      title
      metaDesc
      metaKeywords
      canonical
      metaRobotsNoindex
      metaRobotsNofollow
      opengraphTitle
      opengraphDescription
      opengraphImage {
        sourceUrl
        altText
        mediaDetails {
          height
          width
        }
      }
      opengraphType
      opengraphUrl
      opengraphSiteName
      opengraphPublishedTime
      opengraphModifiedTime
      twitterTitle
      twitterDescription
      twitterImage {
        sourceUrl
        altText
        mediaDetails {
          height
          width
        }
      }
      schema {
        raw
      }
    }
    modified
    databaseId
  }
`;

export const CATEGORY_FIELDS = gql`
  fragment CategoryFields on Category {
    id
    name
    description
    slug
  }
`;

export const PAGINATION_FIELDS = gql`
  fragment PaginationFields on WPPageInfo {
    hasNextPage
    endCursor
    startCursor
    hasPreviousPage
    total
    offsetPagination {
      total
      hasMore
    }
  }
`;

export const POST_CONNECTION_FIELDS = gql`
  fragment PostConnectionFields on RootQueryToPostConnection {
    pageInfo {
      ...PaginationFields
    }
    edges {
      cursor
      node {
        ...PostFields
      }
    }
    nodes {
      ...PostFields
    }
  }
  ${PAGINATION_FIELDS}
  ${POST_FIELDS}
`; 