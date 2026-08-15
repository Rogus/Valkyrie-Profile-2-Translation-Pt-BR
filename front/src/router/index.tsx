import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LazyPage, RootLayout } from './Layout'

import { ErrorPage, Home } from '@/views/pages'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: (
          <LazyPage>
            <Home />
          </LazyPage>
        )
      },
      {
        children: [
          {
            path: 'io',
            element: (
              <LazyPage>
                <div></div>
              </LazyPage>
            )
          }
        ]
      },
      {
        path: '*',
        element: <Navigate to="/" replace />
      }
    ]
  }
])
