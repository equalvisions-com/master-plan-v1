export const BOOKMARK_ERRORS = {
  INVALID_DATA: {
    code: 'INVALID_DATA',
    message: 'Invalid bookmark data provided'
  },
  AUTH_REQUIRED: {
    code: 'AUTH_REQUIRED',
    message: 'Authentication required to manage bookmarks'
  },
  OPERATION_FAILED: {
    code: 'OPERATION_FAILED',
    message: 'Failed to update bookmark'
  }
} as const 