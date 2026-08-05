import { ApolloClient, InMemoryCache, HttpLink, from, fromPromise } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { get_access_token, get_current_role_id, refresh_session } from './auth';

// In development, Vite proxies /graphql to the backend.
// In production, use the full API URL from environment.
const api_url = import.meta.env.DEV ? '/graphql' : `${import.meta.env.VITE_API_URL}/graphql`;

const http_link = new HttpLink({
  uri: api_url,
  credentials: 'same-origin',
});

const auth_link = setContext((_, { headers }) => {
  const token = get_access_token();
  const role_id = get_current_role_id();
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(role_id ? { 'x-active-role-id': role_id } : {}),
    },
  };
});

// On UNAUTHENTICATED, silently refresh the access token once and retry the
// failed operation. The retry re-enters auth_link, which picks up the new token.
const error_link = onError(({ graphQLErrors, operation, forward }) => {
  const is_auth_error = graphQLErrors?.some(
    (err) => err.extensions?.code === 'UNAUTHENTICATED'
  );
  if (!is_auth_error) return;

  const op_name = operation.operationName;
  if (op_name === 'Login' || op_name === 'RefreshToken' || op_name === 'Logout') return;
  if (operation.getContext().auth_retried) return;

  return fromPromise(refresh_session()).flatMap(() => {
    operation.setContext({ auth_retried: true });
    return forward(operation);
  });
});

export const apollo_client = new ApolloClient({
  link: from([error_link, auth_link, http_link]),
  cache: new InMemoryCache(),
});
