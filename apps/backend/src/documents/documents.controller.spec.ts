import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

describe('DocumentsController', () => {
  let controller: DocumentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        {
          provide: DocumentsService,
          useValue: {
            getDocumentTypes: jest.fn(),
            createDraftDocument: jest.fn(),
            getMyDocuments: jest.fn(),
            getDocumentDetail: jest.fn(),
            updateDraftDocument: jest.fn(),
            sendDraftDocument: jest.fn(),
            cancelDocument: jest.fn(),
            reactivateDocument: jest.fn(),
            simulateDocumentViewed: jest.fn(),
            simulateDocumentSigned: jest.fn(),
            simulateDocumentCompleted: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
