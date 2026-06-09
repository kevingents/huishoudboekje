/** Rendert een familiewapen-SVG veilig als afbeelding (data-URL → geen scripts). */
export default function Crest({ svg, className, alt = 'Familiewapen' }: { svg: string; className?: string; alt?: string }) {
  const src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} />
}
