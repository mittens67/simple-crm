import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { USERS_QUERY } from '../lib/graphql-queries';
import type { UserProfile } from '../types/user';

export const useUsers = () => {
  const [error, setError] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery(USERS_QUERY, {
    onError: (err) => setError(err.message),
  });

  return {
    users: (data?.users || []) as UserProfile[],
    loading,
    error,
    setError,
    refetch,
  };
};
