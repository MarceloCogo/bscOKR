import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { hashConsentNonce, verifyConsentState } from '@/lib/security/consent-state'
import { hashScimToken } from '@/lib/security/scim-token'
import { getEntraClientId } from '@/lib/security/entra-config'
import { getUserPermissions } from '@/lib/domain/permissions'
import { randomBytes } from 'crypto'

function createScimToken() {
  return `scim_${randomBytes(24).toString('hex')}`
}

function htmlPage(title: string, body: string) {
  return new Response(
    `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
body{font-family:Nunito,Arial,sans-serif;background:#f7f8fb;margin:0;padding:24px;color:#1f2937}
.card{max-width:780px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,.04);padding:22px}
h1{margin:0 0 8px 0;font-size:22px} p{margin:0 0 14px 0;color:#4b5563}
code{display:block;background:#111827;color:#f9fafb;padding:12px;border-radius:8px;word-break:break-all;font-size:12px}
.btn{background:#e87722;color:#fff;border:0;border-radius:8px;padding:10px 14px;font-weight:600;cursor:pointer}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.ok{color:#065f46}.err{color:#991b1b}
</style></head><body><div class="card">${body}</div></body></html>`,
    { headers: { 'content-type': 'text/html; charset=utf-8' } },
  )
}

export async function GET(request: NextRequest) {
  try {
    const state = request.nextUrl.searchParams.get('state')
    const tenantGuid = request.nextUrl.searchParams.get('tenant')
    const adminConsent = request.nextUrl.searchParams.get('admin_consent')
    const error = request.nextUrl.searchParams.get('error')
    const errorDescription = request.nextUrl.searchParams.get('error_description')

    if (error) {
      return htmlPage(
        'Conexão Microsoft - erro',
        `<h1 class="err">Não foi possível conectar</h1><p>${errorDescription || error}</p>`,
      )
    }

    if (!state || !tenantGuid || adminConsent !== 'True') {
      return htmlPage(
        'Conexão Microsoft - inválida',
        `<h1 class="err">Resposta de consentimento inválida</h1><p>Tente novamente pela tela de login.</p>`,
      )
    }

    const parsed = verifyConsentState(state)
    if (!parsed) {
      return htmlPage(
        'Conexão Microsoft - expirada',
        `<h1 class="err">Sessão de consentimento expirada</h1><p>Reinicie o processo pela área administrativa.</p>`,
      )
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: parsed.tenantId },
      select: { id: true, name: true, slug: true },
    })

    if (!tenant) {
      return htmlPage(
        'Conexão Microsoft - organização',
        `<h1 class="err">Organização não encontrada</h1><p>Verifique o slug informado e tente novamente.</p>`,
      )
    }

    const nonceHash = hashConsentNonce(parsed.nonce)
    const nonceRow = await prisma.authConsentNonce.findFirst({
      where: {
        tenantId: parsed.tenantId,
        userId: parsed.userId,
        nonceHash,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!nonceRow || nonceRow.expiresAt.getTime() < Date.now()) {
      return htmlPage(
        'Conexão Microsoft - expirada',
        `<h1 class="err">Nonce de consentimento inválido</h1><p>Reinicie o processo pela área administrativa.</p>`,
      )
    }

    const permissions = await getUserPermissions(parsed.userId, parsed.tenantId)
    if (!permissions.canManageConfig) {
      return htmlPage(
        'Conexão Microsoft - sem permissão',
        `<h1 class="err">Usuário sem permissão</h1><p>Apenas administradores podem concluir esta conexão.</p>`,
      )
    }

    await prisma.authConsentNonce.update({
      where: { id: nonceRow.id },
      data: { usedAt: new Date() },
    })

    const plainToken = createScimToken()
    const scimTokenHash = hashScimToken(plainToken)

    await prisma.tenantIdentityProvider.upsert({
      where: {
        tenantId_provider: {
          tenantId: tenant.id,
          provider: 'entra',
        },
      },
      update: {
        enabled: true,
        entraTenantId: tenantGuid,
        entraClientId: getEntraClientId(),
        entraClientSecret: null,
        scimTokenHash,
        scimTokenCreatedAt: new Date(),
      },
      create: {
        tenantId: tenant.id,
        provider: 'entra',
        enabled: true,
        entraTenantId: tenantGuid,
        entraClientId: getEntraClientId(),
        entraClientSecret: null,
        scimTokenHash,
        scimTokenCreatedAt: new Date(),
      },
    })

    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin
    const scimBaseUrl = `${baseUrl}/api/scim/v2`

    return htmlPage(
      'Conexão Microsoft concluída',
      `
      <h1 class="ok">Microsoft Entra conectado com sucesso</h1>
      <p>Organização: <strong>${tenant.name}</strong> (${tenant.slug})</p>
      <p>Use estes dados no Provisioning (SCIM) do Azure Entra:</p>
      <p><strong>Base URL</strong></p>
      <code>${scimBaseUrl}</code>
      <p style="margin-top:14px"><strong>Bearer Token (exibido uma única vez)</strong></p>
      <code id="token">${plainToken}</code>
      <div class="row" style="margin-top:12px">
        <button class="btn" onclick="navigator.clipboard.writeText(document.getElementById('token').innerText)">Copiar token</button>
        <a href="/app/admin/config" style="color:#e87722;text-decoration:none;font-weight:700">Voltar para Admin &gt; Configuração</a>
        <a href="/login" style="color:#e87722;text-decoration:none;font-weight:700">Voltar para login</a>
      </div>
      `,
    )
  } catch (error) {
    console.error('Error handling Entra admin consent callback:', error)
    return htmlPage('Conexão Microsoft - erro', `<h1 class="err">Erro interno</h1><p>Tente novamente em instantes.</p>`)
  }
}
