/** Slug helpers for ?pup= deep links and dog switching. */

export const DOG_PRESENCE = {
  tracking: 'tracking',
  active: 'active',
  away: 'away',
}

const PRESENCE_ORDER = [
  DOG_PRESENCE.tracking,
  DOG_PRESENCE.active,
  DOG_PRESENCE.away,
]

/** Resolve Today status. Legacy `away: true` becomes away; everyone else tracks. */
export function dogPresence(dog) {
  const value = dog?.presence
  if (
    value === DOG_PRESENCE.tracking ||
    value === DOG_PRESENCE.active ||
    value === DOG_PRESENCE.away
  ) {
    return value
  }
  return dog?.away ? DOG_PRESENCE.away : DOG_PRESENCE.tracking
}

export function isDogAway(dog) {
  return dogPresence(dog) === DOG_PRESENCE.away
}

export function isDogTracking(dog) {
  return dogPresence(dog) === DOG_PRESENCE.tracking
}

export function isDogActive(dog) {
  return dogPresence(dog) === DOG_PRESENCE.active
}

export function cycleDogPresence(dog) {
  const current = dogPresence(dog)
  const index = PRESENCE_ORDER.indexOf(current)
  return PRESENCE_ORDER[(index + 1) % PRESENCE_ORDER.length]
}

export function presencePatch(presence) {
  const next = dogPresence({ presence })
  return { presence: next, away: next === DOG_PRESENCE.away }
}

export function presenceLabel(presence) {
  if (presence === DOG_PRESENCE.away) return 'Away'
  if (presence === DOG_PRESENCE.active) return 'Active'
  return 'Tracking'
}

export function sortDogsByName(dogs) {
  return [...(dogs ?? [])].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', undefined, {
      sensitivity: 'base',
    }),
  )
}

/** Tracking/active A–Z, then away A–Z. Seeds stored order for packs that predate drag-to-reorder. */
export function seedPackOrder(dogs) {
  const named = sortDogsByName(dogs)
  return [
    ...named.filter((dog) => !isDogAway(dog)),
    ...named.filter((dog) => isDogAway(dog)),
  ]
}

/** Reorder dogs to match orderedIds, appending any missing dogs at the end. */
export function reorderDogs(dogs, orderedIds) {
  const byId = new Map((dogs ?? []).map((dog) => [dog.id, dog]))
  const next = []
  for (const id of orderedIds ?? []) {
    const dog = byId.get(id)
    if (!dog) continue
    next.push(dog)
    byId.delete(id)
  }
  for (const dog of byId.values()) next.push(dog)
  return next
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
