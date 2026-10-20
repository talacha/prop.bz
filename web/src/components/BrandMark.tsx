/** The yellow circle with the star: the favicon, reused as the brand mark. */
export function BrandMark({className = 'brand-star'}: {className?: string}) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="31" fill="#f5b82e" />
      <polygon points="32,12.5 38.2,26.6 53.5,28.2 42,38.4 45.3,53.4 32,45.6 18.7,53.4 22,38.4 10.5,28.2 25.8,26.6" fill="#3a2a00" stroke="#3a2a00" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  )
}

/** "Property Business SaaS Demo": the last two words carry the accent color. */
export function BrandName({name}: {name: string}) {
  const words = name.split(' ')
  const tail = words.length > 2 ? words.slice(-2).join(' ') : ''
  const head = tail ? words.slice(0, -2).join(' ') : name
  return <span>{head}{tail ? <> <b>{tail}</b></> : null}</span>
}
