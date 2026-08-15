import { createHashRouter, Navigate } from 'react-router-dom'
import { LazyPage, RootLayout } from './Layout'

import { ErrorPage, Home, Io } from '@/views/pages'

export const router = createHashRouter([
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
        path: 'io',
        element: (
          <LazyPage>
            <Io />
          </LazyPage>
        )
      },
      {
        path: '*',
        element: <Navigate to="/" replace />
      }
    ]
  }
])
