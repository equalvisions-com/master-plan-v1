import { ApolloError } from '@apollo/client';

export interface ApolloQueryResult<T> {
  data?: T;
  loading: boolean;
  error?: ApolloError;
} 