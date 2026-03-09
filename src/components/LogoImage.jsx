import { useState } from 'react'

export function LogoImage({ src, alt, size = 24, className = '' }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return null
  }

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      className={`logo-image ${className}`.trim()}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  )
}
