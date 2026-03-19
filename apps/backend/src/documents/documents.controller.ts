import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
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
  async getDocumentDetail(@Req() req: any, @Param('id') id: string) {
    return this.documentsService.getDocumentDetail(req.user.id, id);
  }

  @Patch(':id/draft')
  async updateDraftDocument(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: UpdateDraftDocumentDto,
  ) {
    return this.documentsService.updateDraftDocument(req.user.id, id, body);
  }

  @Post(':id/send')
  async sendDocument(@Req() req: any, @Param('id') id: string) {
    return this.documentsService.sendDraftDocument(req.user.id, id);
  }

  @Post(':id/cancel')
  async cancelDocument(@Req() req: any, @Param('id') id: string) {
    return this.documentsService.cancelDocument(req.user.id, id);
  }

  @Post(':id/reactivate')
  async reactivateDocument(@Req() req: any, @Param('id') id: string) {
    return this.documentsService.reactivateDocument(req.user.id, id);
  }

  @Post(':id/simulate-viewed')
  async simulateDocumentViewed(@Req() req: any, @Param('id') id: string) {
    return this.documentsService.simulateDocumentViewed(req.user.id, id);
  }

  @Post(':id/simulate-signed')
  async simulateDocumentSigned(@Req() req: any, @Param('id') id: string) {
    return this.documentsService.simulateDocumentSigned(req.user.id, id);
  }

  @Post(':id/simulate-completed')
  async simulateDocumentCompleted(@Req() req: any, @Param('id') id: string) {
    return this.documentsService.simulateDocumentCompleted(req.user.id, id);
  }
}