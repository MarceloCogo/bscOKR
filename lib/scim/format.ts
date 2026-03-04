type ScimUserInput = {
  id: string
  externalId?: string | null
  email: string
  name: string
  isActive: boolean
  createdAt: Date
  updatedAt?: Date | null
}

export function toScimUser(user: ScimUserInput) {
  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    id: user.id,
    externalId: user.externalId || user.id,
    userName: user.email,
    active: user.isActive,
    displayName: user.name,
    name: {
      formatted: user.name,
    },
    emails: [
      {
        value: user.email,
        type: 'work',
        primary: true,
      },
    ],
    meta: {
      resourceType: 'User',
      created: user.createdAt.toISOString(),
      lastModified: (user.updatedAt || user.createdAt).toISOString(),
    },
  }
}

export function scimError(status: number, detail: string, scimType?: string) {
  return {
    status,
    body: {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      status: String(status),
      detail,
      ...(scimType ? { scimType } : {}),
    },
  }
}
