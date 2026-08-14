/** Slug helpers for ?pup= deep links and dog switching. */

export function isDogAway(dog) {
  return Boolean(dog?.away)
}

export function sortDogsByName(dogs) {
  return [...(dogs ?? [])].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', undefined, {
      sensitivity: 'base',
    }),
  )
}

/** Home dogs A–Z, then paused (away) dogs A–Z. */
export function sortPackDogs(dogs) {
  const named = sortDogsByName(dogs)
  return [
    ...named.filter((dog) => !isDogAway(dog)),
    ...named.filter((dog) => isDogAway(dog)),
  ]
}

export function slugifyName(name) {
  const slug = String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'pup'
}

export function uniqueDogSlug(name, dogs = [], excludeId = null) {
  const base = slugifyName(name)
  let slug = base
  let n = 2
  while (
    dogs.some((dog) => dog.slug === slug && dog.id !== excludeId)
  ) {
    slug = `${base}-${n}`
    n += 1
  }
  return slug
}

/** Match ?pup= value to a dog (slug first, then name). */
export function findDogByPupParam(dogs, pupParam) {
  if (!pupParam || !Array.isArray(dogs) || dogs.length === 0) return null
  const raw = String(pupParam).trim().toLowerCase()
  if (!raw) return null

  const bySlug = dogs.find((dog) => dog.slug?.toLowerCase() === raw)
  if (bySlug) return bySlug

  const byName = dogs.find(
    (dog) => slugifyName(dog.name) === raw || dog.name?.trim().toLowerCase() === raw,
  )
  return byName ?? null
}

export function readPupParam(search = window.location.search) {
  return new URLSearchParams(search).get('pup')
}

/** Build search string for the active dog. Omit ?pup when only one dog. */
export function pupSearchForState(dogs, activeDogId) {
  if (!Array.isArray(dogs) || dogs.length < 2 || !activeDogId) return ''
  const dog = dogs.find((d) => d.id === activeDogId)
  if (!dog?.slug) return ''
  return `?pup=${encodeURIComponent(dog.slug)}`
}
