import { lazy } from 'react'

const ErrorPage = lazy(() => import('./error/ErrorPage'))
const Home = lazy(() => import('./home/Home'))
const Io = lazy(() => import('./io/Io'))

export { ErrorPage, Home, Io }
