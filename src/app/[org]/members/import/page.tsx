import ImportMembersClient from './ImportMembersClient'

// Clean wrapper page (all client logic is in ImportMembersClient.tsx)
export default async function ImportMembersPage({
  params: paramsPromise,
}: {
  params: Promise<{ org: string }>
}) {
  const params = await paramsPromise
  return <ImportMembersClient org={params.org} />
}
