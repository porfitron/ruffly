const src = `${import.meta.env.BASE_URL}favicon.svg`

export default function BrandMark({
  className = 'h-12 w-12',
  alt = '',
}) {
  return (
    <img
      src={src}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      className={`shrink-0 rounded-[22%] ${className}`}
    />
  )
}
