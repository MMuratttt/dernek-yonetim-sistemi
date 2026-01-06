/**
 * Board and Member synchronization utilities
 *
 * This module ensures that Member.title and BoardMember records stay in sync.
 * When a member's title changes, their board membership should reflect it.
 * When board membership changes, the member's title should be updated.
 */

import {
  memberTitleToBoardRole,
  memberTitleToMemberType,
  getBoardTypeForTitle,
} from './boardValidation'

/**
 * Map BoardMemberRole and type to MemberTitle
 */
export function boardRoleToMemberTitle(
  role: string,
  memberType: 'ASIL' | 'YEDEK',
  boardType: 'EXECUTIVE' | 'AUDIT'
): string | null {
  // If it's a yedek member
  if (memberType === 'YEDEK') {
    return boardType === 'EXECUTIVE'
      ? 'YONETIM_KURULU_YEDEK'
      : 'DENETIM_KURULU_YEDEK'
  }

  // For asil members, map based on role
  if (boardType === 'EXECUTIVE') {
    switch (role) {
      case 'PRESIDENT':
        return 'BASKAN'
      case 'VICE_PRESIDENT':
        return 'BASKAN_YARDIMCISI'
      case 'SECRETARY':
        return 'SEKRETER'
      case 'TREASURER':
        return 'SAYMAN'
      case 'MEMBER':
        return 'YONETIM_KURULU_ASIL'
      default:
        return 'YONETIM_KURULU_ASIL'
    }
  } else {
    // AUDIT board
    switch (role) {
      case 'SUPERVISOR':
        return 'DENETIM_KURULU_BASKANI'
      case 'MEMBER':
        return 'DENETIM_KURULU_ASIL'
      default:
        return 'DENETIM_KURULU_ASIL'
    }
  }
}

/**
 * Sync member title to board membership when title is updated
 * This should be called in a transaction after updating member.title
 */
export async function syncMemberTitleToBoard(
  prisma: any,
  memberId: string,
  organizationId: string,
  newTitle: string | null,
  oldTitle?: string | null
) {
  // Get the current member to verify
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, organizationId: true },
  })

  if (!member || member.organizationId !== organizationId) {
    throw new Error('Member not found or organization mismatch')
  }

  // If title is null or UYE, remove from all boards
  if (!newTitle || newTitle === 'UYE') {
    // Remove member from all active board terms
    await prisma.boardMember.deleteMany({
      where: { memberId },
    })
    return
  }

  // Determine which board this title belongs to
  const boardType = getBoardTypeForTitle(newTitle)
  if (!boardType) {
    // Not a board title, remove from boards
    await prisma.boardMember.deleteMany({
      where: { memberId },
    })
    return
  }

  // Find the appropriate board and its active term
  const board = await prisma.board.findUnique({
    where: {
      org_board_type_unique: {
        organizationId,
        type: boardType,
      },
    },
    include: {
      terms: {
        where: { isActive: true },
        orderBy: { startDate: 'desc' },
        take: 1,
      },
    },
  })

  if (!board || board.terms.length === 0) {
    // No active term exists, can't sync to board
    // This is acceptable - title is set but no active term
    return
  }

  const activeTerm = board.terms[0]

  // Map title to role and member type
  const role = memberTitleToBoardRole(newTitle)
  const memberType = memberTitleToMemberType(newTitle)

  // Check if member is already in a different board
  const existingMemberships = await prisma.boardMember.findMany({
    where: { memberId },
    include: {
      term: {
        include: {
          board: true,
        },
      },
    },
  })

  // Remove from other boards
  for (const membership of existingMemberships) {
    if (membership.term.board.type !== boardType) {
      await prisma.boardMember.delete({
        where: {
          memberId_termId: {
            memberId,
            termId: membership.termId,
          },
        },
      })
    }
  }

  // Upsert into the correct board
  await prisma.boardMember.upsert({
    where: {
      memberId_termId: {
        memberId,
        termId: activeTerm.id,
      },
    },
    update: {
      role,
      memberType,
    },
    create: {
      memberId,
      termId: activeTerm.id,
      role,
      memberType,
    },
  })
}

/**
 * Sync board membership to member title when board membership is updated
 * This should be called after updating/creating BoardMember records
 */
export async function syncBoardToMemberTitle(
  prisma: any,
  memberId: string,
  termId: string,
  role: string,
  memberType: 'ASIL' | 'YEDEK',
  organizationId: string
) {
  // Get the board type from the term
  const term = await prisma.boardTerm.findUnique({
    where: { id: termId },
    include: { board: true },
  })

  if (!term || term.board.organizationId !== organizationId) {
    throw new Error('Term not found or organization mismatch')
  }

  // Only sync if this is the active term
  if (!term.isActive) {
    return
  }

  // Map role and type to member title
  const newTitle = boardRoleToMemberTitle(role, memberType, term.board.type)

  // Update the member's title
  await prisma.member.update({
    where: { id: memberId },
    data: { title: newTitle },
  })
}

/**
 * Remove member from board and clear their title if it was a board title
 */
export async function syncBoardMemberRemoval(
  prisma: any,
  memberId: string,
  termId: string,
  organizationId: string
) {
  // Get the member's current title
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, title: true, organizationId: true },
  })

  if (!member || member.organizationId !== organizationId) {
    return
  }

  // Check if member has other active board memberships
  const otherMemberships = await prisma.boardMember.findMany({
    where: {
      memberId,
      termId: { not: termId },
    },
    include: {
      term: {
        where: { isActive: true },
        include: { board: true },
      },
    },
  })

  // If they have other active memberships, update title to reflect that
  if (otherMemberships.length > 0 && otherMemberships[0].term) {
    const otherMembership = otherMemberships[0]
    const newTitle = boardRoleToMemberTitle(
      otherMembership.role,
      otherMembership.memberType,
      otherMembership.term.board.type
    )
    await prisma.member.update({
      where: { id: memberId },
      data: { title: newTitle },
    })
  } else {
    // No other board memberships, clear board-related title
    const currentTitle = member.title
    const boardType = getBoardTypeForTitle(currentTitle)

    if (boardType) {
      // It's a board title, change to UYE
      await prisma.member.update({
        where: { id: memberId },
        data: { title: 'UYE' },
      })
    }
  }
}

/**
 * Get the board president (Yönetim Kurulu Başkanı) for an organization.
 * First tries to find a BoardMember with PRESIDENT role in the active EXECUTIVE term.
 * Falls back to finding a Member with title 'BASKAN' if no BoardMember found.
 */
export async function getBoardPresident(
  prisma: any,
  organizationId: string
): Promise<{ id: string; firstName: string; lastName: string } | null> {
  // First, try to find in BoardMember with active term
  const presidentFromBoard = await prisma.boardMember.findFirst({
    where: {
      term: {
        board: {
          organizationId,
          type: 'EXECUTIVE',
        },
        isActive: true,
      },
      role: 'PRESIDENT',
    },
    include: {
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  if (presidentFromBoard?.member) {
    return {
      id: presidentFromBoard.member.id,
      firstName: presidentFromBoard.member.firstName,
      lastName: presidentFromBoard.member.lastName,
    }
  }

  // Fallback: find member with title 'BASKAN'
  const presidentFromTitle = await prisma.member.findFirst({
    where: {
      organizationId,
      title: 'BASKAN',
      status: 'ACTIVE',
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  })

  return presidentFromTitle
}

/**
 * Validate that assigning a role won't conflict with existing assignments
 */
export async function validateBoardRoleAssignment(
  prisma: any,
  organizationId: string,
  role: string,
  memberType: 'ASIL' | 'YEDEK',
  boardType: 'EXECUTIVE' | 'AUDIT',
  termId: string,
  excludeMemberId?: string
): Promise<{ isValid: boolean; error?: string; conflictingMember?: any }> {
  // MEMBER role can have multiple instances
  if (role === 'MEMBER') {
    return { isValid: true }
  }

  // Check if this role is already assigned in this term
  const existingMember = await prisma.boardMember.findFirst({
    where: {
      termId,
      role,
      memberType,
      ...(excludeMemberId ? { memberId: { not: excludeMemberId } } : {}),
    },
    include: {
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
        },
      },
    },
  })

  if (existingMember) {
    const roleNames: Record<string, string> = {
      PRESIDENT: 'Yönetim Kurulu Başkanı',
      VICE_PRESIDENT: 'Yönetim Kurulu Başkan Yardımcısı',
      SECRETARY: 'Sekreter',
      TREASURER: 'Sayman',
      SUPERVISOR: 'Denetim Kurulu Başkanı',
    }

    return {
      isValid: false,
      error: `Bu rol zaten atanmış: ${roleNames[role] || role} (${memberType})`,
      conflictingMember: existingMember.member,
    }
  }

  // Also check member.title for the corresponding title
  const memberTitle = boardRoleToMemberTitle(role, memberType, boardType)
  if (memberTitle && memberTitle !== 'UYE') {
    const existingTitleMember = await prisma.member.findFirst({
      where: {
        organizationId,
        title: memberTitle,
        ...(excludeMemberId ? { id: { not: excludeMemberId } } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        title: true,
      },
    })

    if (existingTitleMember) {
      const titleNames: Record<string, string> = {
        BASKAN: 'Yönetim Kurulu Başkanı',
        BASKAN_YARDIMCISI: 'Yönetim Kurulu Başkan Yardımcısı',
        SEKRETER: 'Sekreter',
        SAYMAN: 'Sayman',
        DENETIM_KURULU_BASKANI: 'Denetim Kurulu Başkanı',
      }

      return {
        isValid: false,
        error: `Bu statü zaten atanmış: ${titleNames[memberTitle] || memberTitle}`,
        conflictingMember: existingTitleMember,
      }
    }
  }

  return { isValid: true }
}
