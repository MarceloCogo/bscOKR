import { redirect } from 'next/navigation'

export default function FirstAccessPage() {
  redirect('/login?firstAccess=1')
}
