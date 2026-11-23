import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
  HttpLink,
} from '@apollo/client';
import { BrowserRouter } from 'react-router-dom';

import './index.css';
import App from './App';
import { LeagueProvider } from './lib/league';

const httpLink = new HttpLink({
  uri: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/graphql',
});

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache({
    typePolicies: {
      // Player objects are snapshots tied to a league, gameweek and horizon,
      // so they are stored inside each result rather than merged by id.
      PlayerModel: { keyFields: false },
    },
  }),
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <LeagueProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </LeagueProvider>
    </ApolloProvider>
  </React.StrictMode>,
);