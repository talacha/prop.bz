import type {Faq} from '@/lib/faq'

/** Visible Q&A (native <details>, no JS). The same questions go out as FAQPage JSON-LD. */
export function FaqSection({faqs, title, id}: {faqs: Faq[]; title: string; id: string}) {
  if (!faqs.length) return null
  return (
    <section className="section faq" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      <div className="faq-list">
        {faqs.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
