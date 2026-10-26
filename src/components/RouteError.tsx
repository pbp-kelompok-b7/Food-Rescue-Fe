import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { ApiError } from '../services/api.ts'
import PageState from './PageState.tsx'
import { errorCopy } from '../services/errors.ts'

export default function RouteError() {
  const error = useRouteError()
  const status = isRouteErrorResponse(error) || error instanceof ApiError ? error.status : undefined
  const { title, message } = errorCopy(status)
  return (
    <PageState error title={title} action={
      <div className="flex flex-wrap gap-3">
        {status === 401 && <Link className="fr-button" to="/login">Masuk</Link>}
        <a className="fr-button" href="">Muat ulang</a>
        <Link className="fr-button bg-surface text-primary-hover" to="/">Ke beranda</Link>
      </div>
    }>{message}</PageState>
  )
}
