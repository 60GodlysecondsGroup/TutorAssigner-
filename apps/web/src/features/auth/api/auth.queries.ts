import { useQuery } from '@tanstack/react-query';
import { authApi } from './auth.api';

/** Fábrica de query keys de auth (para invalidaciones cruzadas). */
export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
};

export function useMeQuery() {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: authApi.me,
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
