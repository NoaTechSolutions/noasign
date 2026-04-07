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
}
