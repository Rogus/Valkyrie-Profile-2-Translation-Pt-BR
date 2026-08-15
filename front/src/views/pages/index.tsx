import { lazy } from 'react'

const ErrorPage = lazy(() => import('./error/ErrorPage'))
const Home = lazy(() => import('./home/Home'))

export { ErrorPage, Home }
