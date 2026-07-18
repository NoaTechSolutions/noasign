import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LegalDocType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// A version is SERVABLE iff it is the active one for its docType AND has real
// content. The popup links to what it asks you to accept — an active version with
// empty content would be a "read the Terms" link that leads to nothing (a lying
// copy). So "servable" is the single definition used for BOTH what's pending and
// what can be accepted; they can't diverge.
@Injectable()
export class LegalService {
  constructor(private readonly prisma: PrismaService) {}

  // Make a version THE active one for its docType (exactly one active per docType).
  // ⚠️ THE LOCK — "the lawyer is the gate, in code": a DRAFT (unreviewed text) is
  // REFUSED unless an explicit `allowDraft` override is passed. So no accidental
  // activation of unreviewed terms can ever block real clients — even if someone
  // runs the activation by mistake, an unapproved draft won't go live. (We can't
  // key this on NODE_ENV: staging AND prod are both `production`.) A real go-live
  // uses a lawyer-approved, non-draft version → no override needed.
  async activateVersion(
    versionId: string,
    opts: { allowDraft?: boolean } = {},
  ) {
    const v = await this.prisma.legalDocumentVersion.findUnique({
      where: { id: versionId },
    });
    if (!v) throw new NotFoundException('Legal version not found');
    if (v.isDraft && !opts.allowDraft) {
      throw new BadRequestException(
        `Refusing to activate a DRAFT (unreviewed) ${v.docType} version. A draft must ` +
          `be reviewed/approved (isDraft=false) before it can go live — or pass an ` +
          `explicit allowDraft override for testing. The lawyer is the gate, in code.`,
      );
    }
    await this.prisma.$transaction([
      this.prisma.legalDocumentVersion.updateMany({
        where: { docType: v.docType, isActive: true },
        data: { isActive: false },
      }),
      this.prisma.legalDocumentVersion.update({
        where: { id: versionId },
        data: { isActive: true },
      }),
    ]);
    return { activated: { docType: v.docType, version: v.version } };
  }

  // The active, servable version for a docType. 404 if none — the popup/footer
  // must never link to a docType that isn't actually servable.
  async getActiveVersion(docType: LegalDocType) {
    const v = await this.prisma.legalDocumentVersion.findFirst({
      where: { docType, isActive: true },
    });
    if (!v || !v.content || v.content.trim() === '') {
      throw new NotFoundException(
        `No servable active version for ${docType}. A "read the ${docType}" link ` +
          `would be dead — refusing to serve an empty/absent legal document.`,
      );
    }
    return {
      docType: v.docType,
      version: v.version,
      contentHash: v.contentHash,
      content: v.content,
      publishedAt: v.publishedAt,
      isDraft: v.isDraft,
    };
  }

  // The servable active version per docType (one each). Empty content is excluded
  // — an active-but-empty version is NOT something a user can be asked to accept.
  private async servableActiveVersions() {
    const active = await this.prisma.legalDocumentVersion.findMany({
      where: { isActive: true },
    });
    return active.filter((v) => v.content && v.content.trim() !== '');
  }

  // What the current user still needs to accept: docTypes with a servable active
  // version they have no acceptance row for.
  async getAcceptanceStatus(userId: string) {
    const versions = await this.servableActiveVersions();
    const accepted = await this.prisma.legalAcceptance.findMany({
      where: { userId, versionId: { in: versions.map((v) => v.id) } },
      select: { versionId: true },
    });
    const acceptedIds = new Set(accepted.map((a) => a.versionId));
    const pending = versions
      .filter((v) => !acceptedIds.has(v.id))
      .map((v) => ({ docType: v.docType, version: v.version }));
    return { pending, mustAccept: pending.length > 0 };
  }

  // Record acceptance for EVERY servable active version the user hasn't accepted.
  // Append-only. Captures IP + user agent. Refuses if there is nothing servable to
  // accept (you can't accept a document that isn't there).
  async recordAcceptance(
    userId: string,
    ip: string | null,
    userAgent: string | null,
  ) {
    const versions = await this.servableActiveVersions();
    if (versions.length === 0) {
      throw new NotFoundException(
        'No servable active legal versions to accept — nothing to record.',
      );
    }
    const accepted = await this.prisma.legalAcceptance.findMany({
      where: { userId, versionId: { in: versions.map((v) => v.id) } },
      select: { versionId: true },
    });
    const acceptedIds = new Set(accepted.map((a) => a.versionId));
    const toRecord = versions.filter((v) => !acceptedIds.has(v.id));

    await this.prisma.legalAcceptance.createMany({
      data: toRecord.map((v) => ({
        userId,
        versionId: v.id,
        docType: v.docType,
        ipAddress: ip,
        userAgent,
      })),
    });
    return { recorded: toRecord.map((v) => ({ docType: v.docType, version: v.version })) };
  }
}
