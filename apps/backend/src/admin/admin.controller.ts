import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminService } from './admin.service';
import { CreateFormDefinitionDto } from './dto/create-form-definition.dto';
import { UpdateFormDefinitionDto } from './dto/update-form-definition.dto';
import { CreateSignatureTemplateDto } from './dto/create-signature-template.dto';
import { UpdateSignatureTemplateDto } from './dto/update-signature-template.dto';
import { CreateUserDocumentConfigDto } from './dto/create-user-document-config.dto';

@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // ── FormDefinition endpoints ─────────────────────────────────────────────

  @Post('form-definitions')
  async createFormDefinition(
    @Req() req: any,
    @Body() body: CreateFormDefinitionDto,
  ) {
    return this.adminService.createFormDefinition(req.user.id, body);
  }

  @Get('form-definitions')
  async listFormDefinitions(
    @Req() req: any,
    @Query('documentTypeId') documentTypeId?: string,
  ) {
    return this.adminService.listFormDefinitions(req.user.id, documentTypeId);
  }

  @Get('form-definitions/:id')
  async getFormDefinition(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.adminService.getFormDefinition(req.user.id, id);
  }

  @Patch('form-definitions/:id')
  async updateFormDefinition(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateFormDefinitionDto,
  ) {
    return this.adminService.updateFormDefinition(req.user.id, id, body);
  }

  @Delete('form-definitions/:id')
  async deleteFormDefinition(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.adminService.deleteFormDefinition(req.user.id, id);
  }

  // ── SignatureTemplate endpoints ──────────────────────────────────────────

  @Post('signature-templates')
  async createSignatureTemplate(
    @Req() req: any,
    @Body() body: CreateSignatureTemplateDto,
  ) {
    return this.adminService.createSignatureTemplate(req.user.id, body);
  }

  @Get('signature-templates')
  async listSignatureTemplates(
    @Req() req: any,
    @Query('documentTypeId') documentTypeId?: string,
  ) {
    return this.adminService.listSignatureTemplates(req.user.id, documentTypeId);
  }

  @Get('signature-templates/:id')
  async getSignatureTemplate(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.adminService.getSignatureTemplate(req.user.id, id);
  }

  @Patch('signature-templates/:id')
  async updateSignatureTemplate(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateSignatureTemplateDto,
  ) {
    return this.adminService.updateSignatureTemplate(req.user.id, id, body);
  }

  @Delete('signature-templates/:id')
  async deleteSignatureTemplate(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.adminService.deleteSignatureTemplate(req.user.id, id);
  }

  // ── UserDocumentConfig endpoints ─────────────────────────────────────────

  @Post('user-document-configs')
  async createUserDocumentConfig(
    @Req() req: any,
    @Body() body: CreateUserDocumentConfigDto,
  ) {
    return this.adminService.createUserDocumentConfig(req.user.id, body);
  }

  @Get('user-document-configs')
  async listUserDocumentConfigs(
    @Req() req: any,
    @Query('userId') targetUserId?: string,
  ) {
    return this.adminService.listUserDocumentConfigs(req.user.id, targetUserId);
  }

  @Patch('user-document-configs/:id/activate')
  async activateUserDocumentConfig(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.adminService.toggleUserDocumentConfig(req.user.id, id, true);
  }

  @Patch('user-document-configs/:id/deactivate')
  async deactivateUserDocumentConfig(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.adminService.toggleUserDocumentConfig(req.user.id, id, false);
  }

  @Delete('user-document-configs/:id')
  async deleteUserDocumentConfig(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.adminService.deleteUserDocumentConfig(req.user.id, id);
  }
}
