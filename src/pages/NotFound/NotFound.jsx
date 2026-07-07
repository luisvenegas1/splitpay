import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <h1>404</h1>
      <p>Página no encontrada.</p>
      <Link to="/">Volver al inicio</Link>
    </main>
  )
}
