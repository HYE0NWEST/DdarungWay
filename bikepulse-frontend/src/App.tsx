import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { queryClient } from './lib/queryClient';
import { appRouter } from './app/router';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={appRouter} />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}

export default App;
