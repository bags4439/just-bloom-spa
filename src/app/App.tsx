import React from 'react';

import { Providers } from './Providers';
import { AppRouter } from './Router';

export const App: React.FC = () => {
  return (
    <Providers>
      <AppRouter />
    </Providers>
  );
};
