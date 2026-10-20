import Link from 'next/link'

export default function NotFound() {
  return (
    <section className="wrap" style={{paddingBlock: '60px'}}>
      <h1>404</h1>
      <p>Esta página no existe · This page does not exist.</p>
      <p><Link className="pill" href="/">← Property Business SaaS Demo</Link></p>
    </section>
  )
}
