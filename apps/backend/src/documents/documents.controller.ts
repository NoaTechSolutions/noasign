import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateDraftDocumentDto } from './dto/create-draft-document.dto';
import { UpdateDraftDocumentDto } from './dto/update-draft-document.dto';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Get('types')
  async getDocumentTypes() {
    return this.documentsService.getDocumentTypes();
  }

  @Post('draft')
  async createDraftDocument(
    @Req() req: any,
    @Body() body: CreateDraftDocumentDto,
  ) {
    return this.documentsService.createDraftDocument(req.user.id, body);
  }

  @Get('my-documents')
  async getMyDocuments(@Req() req: any) {
    return this.documentsService.getMyDocuments(req.user.id);
  }

  @Get(':id')
  async getDocumentDetail(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.documentsService.getDocumentDetail(req.user.id, id);
  }

  @Get(':id/public-links')
  async getDocumentPublicLinks(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.documentsService.getDocumentPublicLinks(req.user.id, id);
  }

  @Patch(':id/draft')
  async updateDraftDocument(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateDraftDocumentDto,
  ) {
    return this.documentsService.updateDraftDocument(req.user.id, id, body);
  }

  @Post(':id/send')
  async sendDocument(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.documentsService.sendDraftDocument(req.user.id, id);
  }

  @Post(':id/resend')
  async resendDocument(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.documentsService.resendDocument(req.user.id, id);
  }

  @Post(':id/sync-status')
  async syncDocumentStatus(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.documentsService.syncDocumentStatus(req.user.id, id);
  }

  @Get(':id/final-pdf')
  async downloadFinalPdf(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res() res: Response,
  ) {
    await this.documentsService.streamFinalPdf(req.user.id, id, res);
  }

  @Post(':id/cancel')
  async cancelDocument(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.documentsService.cancelDocument(req.user.id, id);
  }

  @Post(':id/reactivate')
  async reactivateDocument(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.documentsService.reactivateDocument(req.user.id, id);
  }

  @Post(':id/simulate-viewed')
  async simulateDocumentViewed(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.documentsService.simulateDocumentViewed(req.user.id, id);
  }

  @Post(':id/simulate-signed')
  async simulateDocumentSigned(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.documentsService.simulateDocumentSigned(req.user.id, id);
  }

  @Post(':id/simulate-completed')
  async simulateDocumentCompleted(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.documentsService.simulateDocumentCompleted(req.user.id, id);
  }
}
