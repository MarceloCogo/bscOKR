export function getEntraClientId() {
  return (
    process.env.ENTRA_CLIENT_ID ||
    process.env.AZURE_AD_CLIENT_ID ||
    process.env.AUTH_AZURE_AD_ID ||
    null
  )
}

export function getEntraClientSecret() {
  return (
    process.env.ENTRA_CLIENT_SECRET ||
    process.env.AZURE_AD_CLIENT_SECRET ||
    process.env.AUTH_AZURE_AD_SECRET ||
    null
  )
}

export function getEntraTenantId() {
  return (
    process.env.ENTRA_TENANT_ID ||
    process.env.AZURE_AD_TENANT_ID ||
    process.env.AUTH_AZURE_AD_TENANT_ID ||
    null
  )
}
