import { describe, it, expect, vi } from 'vitest'

vi.mock('../lib/auth', () => ({
  getSession: vi.fn(async () => ({ user: { id: 'user1' } })),
}))

const { deleteMock, findUniqueMock, findFirstMembershipMock, memberCountMock } =
  vi.hoisted(() => {
    return {
      deleteMock: vi.fn().mockResolvedValue({ id: 'org1' }),
      findUniqueMock: vi.fn(async ({ where }: any) =>
        where.slug === 'org-to-delete'
          ? { id: 'org1', slug: 'org-to-delete' }
          : null
      ),
      findFirstMembershipMock: vi.fn(async ({ where }: any) =>
        where.role === 'SUPERADMIN' && where.userId === 'user1'
          ? { id: 'm1' }
          : null
      ),
      memberCountMock: vi.fn(async ({ where }: any) => {
        if (where.organizationId === 'org1') return 0
        return 0
      }),
    }
  })
vi.mock('../lib/prisma', () => ({
  prisma: {
    organization: {
      findUnique: findUniqueMock,
      delete: deleteMock,
    },
    organizationMembership: {
      findFirst: findFirstMembershipMock,
    },
    member: {
      count: memberCountMock,
    },
  },
}))

import { DELETE as deleteHandler } from '../app/api/org/[slug]/route'

function makeReq(slug: string) {
  return new Request(`http://test.local/api/org/${slug}`, { method: 'DELETE' })
}

describe('DELETE /api/org/[slug]', () => {
  it('returns 404 for missing org', async () => {
    deleteMock.mockClear()
    findUniqueMock.mockClear()
    const res = await deleteHandler(makeReq('missing'), {
      params: { slug: 'missing' },
    })
    expect(res.status).toBe(404)
  })

  it('deletes when superadmin and no members', async () => {
    deleteMock.mockClear()
    findUniqueMock.mockClear()
    const res = await deleteHandler(makeReq('org-to-delete'), {
      params: { slug: 'org-to-delete' },
    })
    expect(res.status).toBe(200)
    expect(deleteMock).toHaveBeenCalled()
  })
})
