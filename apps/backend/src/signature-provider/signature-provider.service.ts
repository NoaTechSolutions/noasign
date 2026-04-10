import { Injectable } from '@nestjs/common';
import { BoldSignService } from '../boldsign/boldsign.service';
import {
  CreateSignatureDocumentRequest,
  RemindSignatureDocumentRequest,
  SendSignatureDocumentRequest,
  SignatureBinaryResponse,
  SignatureDocumentResponse,
} from './signature-provider.types';

@Injectable()
export class SignatureProviderService {
  constructor(private readonly boldSignService: BoldSignService) {}

  async createDocumentFromTemplate(
    payload: CreateSignatureDocumentRequest,
  ): Promise<SignatureDocumentResponse> {
    return this.boldSignService.createDocumentFromTemplate(payload);
  }

  async getDocumentStatus(
    documentId: string,
  ): Promise<{ id: string; status: string }> {
    return this.boldSignService.getDocumentStatus(documentId);
  }

  async sendDocument(
    documentId: string,
    payload: SendSignatureDocumentRequest,
  ): Promise<void> {
    return this.boldSignService.sendDocument(documentId, payload);
  }

  async resendDocument(
    documentId: string,
    payload?: RemindSignatureDocumentRequest,
  ): Promise<void> {
    return this.boldSignService.resendDocument(documentId, payload);
  }

  async downloadDocumentPdf(
    documentId: string,
  ): Promise<SignatureBinaryResponse> {
    return this.boldSignService.downloadDocumentPdf(documentId);
  }

  async getSigningLink(
    documentId: string,
    signerEmail: string,
  ): Promise<string> {
    return this.boldSignService.getSigningLink(documentId, signerEmail);
  }

  async waitForDocumentDraft(
    documentId: string,
    _timeoutMs = 45000,
  ): Promise<{ id: string; status: string }> {
    return this.boldSignService.waitForDocumentDraft(documentId);
  }
}
