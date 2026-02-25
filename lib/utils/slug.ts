import slugify from 'slugify'

export function generateSlug(name: string): string {
  const baseSlug = slugify(name, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g,
  })

  // Add random suffix to ensure uniqueness
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  return `${baseSlug}-${randomSuffix}`
}

export async function generateUniqueSlug(name: string, checkUniqueness: (slug: string) => Promise<boolean>): Promise<string> {
  let slug = generateSlug(name)
  let counter = 1

  while (await checkUniqueness(slug)) {
    slug = `${generateSlug(name)}-${counter}`
    counter++
  }

  return slug
}