import { gql, type DocumentNode } from '@apollo/client';
import { POST_FIELDS, CATEGORY_FIELDS } from '../fragments';
import { GET_ALL_FOR_SEARCH } from './posts';

// Define the type for our queries object
export type QueriesType = {
  posts: {
    getLatest: DocumentNode;
    getBySlug: DocumentNode;
    getAll: DocumentNode;
    getBySlugs: DocumentNode;
    getMetaFields: DocumentNode;
    getAllForSearch: DocumentNode;
    getRelatedPosts: DocumentNode;
    getPostAndRelated: DocumentNode;
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
        posts(
          first: $first, 
          after: $after,
          where: { 
            status: PUBLISH,
            orderby: { field: DATE, order: DESC }
          }
        ) {
          nodes {
            ...PostFields
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
        seo {
          contentTypes {
            post {
              title
              metaDesc
              metaRobotsNoindex
              schema {
                raw
              }
            }
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
    `,
    getAllForSearch: GET_ALL_FOR_SEARCH,
    getRelatedPosts: gql`
      query GetRelatedPosts($categorySlug: String!, $exclude: ID!, $first: Int!) {
        posts(where: { categoryName: $categorySlug, notIn: [$exclude] }, first: $first) {
          nodes {
            id
            title
            slug
            featuredImage {
              node {
                sourceUrl
                altText
              }
            }
            categories {
              nodes {
                slug
              }
            }
          }
        }
      }
    `,
    getPostAndRelated: gql`
      query GetPostAndRelated($slug: ID!, $categorySlug: String!, $first: Int!) {
        post: post(id: $slug, idType: SLUG) {
          ...PostFields
        }
        relatedPosts: posts(where: { categoryName: $categorySlug }, first: $first) {
          nodes {
            ...PostFields
          }
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
          seo {
            title
            metaDesc
            metaRobotsNoindex
            metaRobotsNofollow
            schema {
              raw
            }
          }
          posts(
            first: $first, 
            after: $after,
            where: { 
              status: PUBLISH,
              orderby: { field: DATE, order: DESC }
            }
          ) {
            nodes {
              ...PostFields
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
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