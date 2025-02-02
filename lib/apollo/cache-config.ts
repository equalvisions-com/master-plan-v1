import { TypePolicies } from '@apollo/client'

export const cacheConfig: { typePolicies: TypePolicies } = {
  typePolicies: {
    Query: {
      fields: {
        posts: {
          keyArgs: ['where', ['categoryName', 'categoryId']],
          merge(existing = { nodes: [] }, incoming, { args }) {
            // Don't merge if it's a different query
            if (args?.after !== existing?.pageInfo?.endCursor) {
              return incoming;
            }
            return {
              ...incoming,
              nodes: [...(existing.nodes || []), ...(incoming.nodes || [])],
            };
          },
        }
      }
    },
    Post: {
      keyFields: ['id', 'contentType'],
      fields: {
        likes: {
          read() {
            return undefined; // Force refetch
          }
        },
        categories: {
          merge: false
        }
      }
    },
    Category: {
      keyFields: ['id'],
      fields: {
        posts: {
          merge: false
        }
      }
    },
    MediaItem: {
      keyFields: ['id', 'sourceUrl'],
    }
  }
}; 