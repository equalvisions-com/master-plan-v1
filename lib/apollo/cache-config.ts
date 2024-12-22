export const cacheConfig = {
  typePolicies: {
    Post: {
      keyFields: ['id'],
      fields: {
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
}; 