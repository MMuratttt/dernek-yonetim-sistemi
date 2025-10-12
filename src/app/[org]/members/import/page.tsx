import ImportMembersClient from './ImportMembersClient'

// Clean wrapper page (all client logic is in ImportMembersClient.tsx)
export default function ImportMembersPage({
  params,
}: {
  params: { org: string }
}) {
  return <ImportMembersClient org={params.org} />
}
