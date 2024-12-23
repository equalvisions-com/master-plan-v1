import { TypePolicies } from '@apollo/client'

export const cacheConfig = {
  typePolicies: {
    Post: {
      keyFields: ['id', 'contentType'],
      fields: {
        content: {
          merge: true,
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
    }
  }
} as const; 