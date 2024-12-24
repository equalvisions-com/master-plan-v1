import { gql, type DocumentNode } from '@apollo/client';
import { POST_FIELDS, CATEGORY_FIELDS } from '../fragments';

// Define the type for our queries object
export type QueriesType = {
  posts: {
    getLatest: DocumentNode;
    getBySlug: DocumentNode;
    getAll: DocumentNode;
    getBySlugs: DocumentNode;
    getMetaFields: DocumentNode;
  };
  categories: {
    getWithPosts: DocumentNode;
    getAll: DocumentNode;
  };
};

// Create and export the queries object with all queries
export const queries: QueriesType = {
  posts: {
    getLatest: gql`
      query GetLatestPosts($first: Int!, $after: String) {
        posts(first: $first, after: $after) {
          nodes {
            ...PostFields
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
      ${POST_FIELDS}
    `,
    getBySlug: gql`
      query GetPostBySlug($slug: ID!) {
        post(id: $slug, idType: SLUG) {
          ...PostFields
        }
      }
      ${POST_FIELDS}
    `,
    getAll: gql`
      query GetAllPosts {
        posts(first: 100) {
          nodes {
            ...PostFields
          }
        }
      }
      ${POST_FIELDS}
    `,
    getBySlugs: gql`
      query GetPostsBySlugs($slugs: [String!]!) {
        posts(where: { slugIn: $slugs }) {
          nodes {
            ...PostFields
          }
        }
      }
      ${POST_FIELDS}
    `,
    getMetaFields: gql`
      query GetPostMetaFields($slug: ID!) {
        post(id: $slug, idType: SLUG) {
          ...PostMetaFields
        }
      }
      ${POST_FIELDS}
    `
  },
  categories: {
    getWithPosts: gql`
      query GetCategoryAndPosts($slug: ID!, $first: Int!, $after: String) {
        category(id: $slug, idType: SLUG) {
          ...CategoryFields
          posts(first: $first, after: $after) {
            nodes {
              ...PostFields
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
      ${CATEGORY_FIELDS}
      ${POST_FIELDS}
    `,
    getAll: gql`
      query GetAllCategories {
        categories {
          nodes {
            ...CategoryFields
          }
        }
      }
      ${CATEGORY_FIELDS}
    `
  }
}; 