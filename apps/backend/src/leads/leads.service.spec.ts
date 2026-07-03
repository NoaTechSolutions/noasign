import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

const prismaMock = {
  lead: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const emailMock = {
  sendLeadNotification: jest.fn(),
};

describe('LeadsService', () => {
  let service: LeadsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EmailService, useValue: emailMock },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create (step 1)', () => {
    it('normalizes the email, defaults the source, returns the id and notifies', async () => {
      prismaMock.lead.create.mockResolvedValue({ id: 'lead-1' });

      const result = await service.create({ email: '  John@Example.COM ' });

      expect(prismaMock.lead.create).toHaveBeenCalledWith({
        data: { email: 'john@example.com', source: 'signature-complete' },
        select: { id: true },
      });
      expect(result).toEqual({ id: 'lead-1' });
      expect(emailMock.sendLeadNotification).toHaveBeenCalledWith({
        email: 'john@example.com',
        source: 'signature-complete',
        stage: 'captured',
      });
    });

    it('keeps an explicit source', async () => {
      prismaMock.lead.create.mockResolvedValue({ id: 'lead-2' });

      await service.create({ email: 'a@b.com', source: 'pricing-page' });

      expect(prismaMock.lead.create).toHaveBeenCalledWith({
        data: { email: 'a@b.com', source: 'pricing-page' },
        select: { id: true },
      });
    });

    it('still succeeds when the notification email fails (best-effort)', async () => {
      prismaMock.lead.create.mockResolvedValue({ id: 'lead-3' });
      emailMock.sendLeadNotification.mockRejectedValueOnce(
        new Error('resend down'),
      );

      await expect(service.create({ email: 'a@b.com' })).resolves.toEqual({
        id: 'lead-3',
      });
    });
  });

  describe('enrich (step 2)', () => {
    it('merges trimmed name + phone into the existing lead and notifies', async () => {
      prismaMock.lead.findUnique.mockResolvedValue({
        id: 'lead-1',
        email: 'a@b.com',
        source: 'signature-complete',
      });
      prismaMock.lead.update.mockResolvedValue({ id: 'lead-1' });

      await service.enrich('lead-1', { name: '  Jane  ', phone: ' +1 555 ' });

      expect(prismaMock.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: { name: 'Jane', phone: '+1 555' },
      });
      expect(emailMock.sendLeadNotification).toHaveBeenCalledWith({
        email: 'a@b.com',
        source: 'signature-complete',
        name: 'Jane',
        phone: '+1 555',
        stage: 'enriched',
      });
    });

    it('rejects a payload with neither name nor phone', async () => {
      await expect(
        service.enrich('lead-1', { name: '   ' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.lead.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.lead.update).not.toHaveBeenCalled();
    });

    it('throws when the lead id does not exist', async () => {
      prismaMock.lead.findUnique.mockResolvedValue(null);

      await expect(
        service.enrich('missing', { name: 'Jane' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.lead.update).not.toHaveBeenCalled();
    });
  });
});
