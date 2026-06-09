import { redirect } from 'next/navigation'

// Abonnementen zijn nu de pakketten/modules — oude links doorsturen.
export default function AbonnementenRedirect() {
  redirect('/modules')
}
