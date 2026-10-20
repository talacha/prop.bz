import Link from 'next/link'

export default function NotFound() {
  return (
    <section className="hero">
      <h1>404</h1>
      <p>Esta página no existe · This page does not exist.</p>
      <p><Link className="pill" href="/">← A Toda Madre</Link></p>
    </section>
  )
}
