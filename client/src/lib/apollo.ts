import { ApolloClient, InMemoryCache, HttpLink, from, fromPromise } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { get_access_token, refresh_session } from './auth';

const http_link = new HttpLink({
  uri: '/graphql',
  credentials: 'same-origin',
});

const auth_link = setContext((_, { headers }) => {
  const token = get_access_token();
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
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
