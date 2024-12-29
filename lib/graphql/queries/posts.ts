import { gql } from '@apollo/client';
import { POST_FIELDS, POST_META_FIELDS, POST_CONNECTION_FIELDS } from '../fragments';

export const GET_POSTS = gql`
  query GetPosts($first: Int!, $after: String, $where: PostObjectsConnectionWhereArgs) {
    posts(first: $first, after: $after, where: $where) {
      nodes {
        id
        title
        slug
        excerpt
        date
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
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_POST_BY_SLUG = gql`
  query GetPostBySlug($slug: ID!) {
    post(id: $slug, idType: SLUG) {
      id
      databaseId
      title
      slug
      content
      excerpt
      date
      modified
      featuredImage {
        node {
          sourceUrl
          altText
          mediaDetails {
            height
            width
          }
        }
      }
      categories {
        nodes {
          id
          name
          slug
        }
      }
      author {
        node {
          name
        }
      }
      seo {
        title
        metaDesc
      }
    }
  }
`;

export const GET_ALL_POSTS = gql`
  ${POST_CONNECTION_FIELDS}
  query GetAllPosts($first: Int = 100) {
    posts(first: $first) {
      ...PostConnectionFields
    }
  }
`;

export const GET_POSTS_BY_SLUGS = gql`
  ${POST_CONNECTION_FIELDS}
  query GetPostsBySlugs($slugs: [String!]!) {
    posts(where: { slugIn: $slugs }) {
      ...PostConnectionFields
    }
  }
`;

export const GET_POSTS_BY_CATEGORY = gql`
  ${POST_CONNECTION_FIELDS}
  query GetPostsByCategory($categoryId: ID!, $first: Int!, $after: String) {
    category(id: $categoryId, idType: SLUG) {
      id
      name
      posts(first: $first, after: $after) {
        ...PostConnectionFields
      }
    }
  }
`;

export const GET_META_FIELDS = gql`
  ${POST_META_FIELDS}
  query GetPostMetaFields($slug: ID!) {
    post(id: $slug, idType: SLUG) {
      ...PostMetaFields
    }
  }
`;

export const getBySlug = gql`
  query GetPostBySlug($slug: String!) {
    post(id: $slug, idType: SLUG) {
      id
      slug
      title
      content
      excerpt
      date
      modified
      sitemapUrl
      featuredImage {
        node {
          sourceUrl
          altText
          mediaDetails {
            height
            width
          }
        }
      }
      categories {
        nodes {
          id
          slug
          name
        }
      }
      seo {
        title
        metaDesc
        canonical
        metaKeywords
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
    }
  }
`;

export const getLatest = gql`
  query GetLatestPosts($first: Int!, $after: String, $where: PostObjectsConnectionOrderbyInput) {
    posts(first: $first, after: $after, where: $where) {
      nodes {
        id
        title
        slug
        date
        excerpt
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
      pageInfo {
        hasNextPage
        endCursor
        startCursor
        hasPreviousPage
      }
    }
  }
`;

export const GET_ALL_FOR_SEARCH = gql`
  ${POST_FIELDS}
  query GetAllPostsForSearch {
    posts(
      first: 1000,
      where: { 
        status: PUBLISH,
        orderby: { field: DATE, order: DESC }
      }
    ) {
      nodes {
        ...PostFields
      }
    }
  }
`;

export const queries = {
  getLatest: getLatest,
  getBySlug: getBySlug,
  getAll: GET_ALL_POSTS,
  getBySlugs: GET_POSTS_BY_SLUGS,
  getMetaFields: GET_META_FIELDS,
  getAllForSearch: GET_ALL_FOR_SEARCH
}; 