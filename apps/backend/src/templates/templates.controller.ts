import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TemplatesService } from './templates.service';
import {
  SELECTABLE_CATEGORIES,
  SelectableCategory,
  SetActiveTemplateDto,
} from './dto/set-active-template.dto';

@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  // Catalog of templates available to the tenant for a category, each flagged
  // with whether it is the tenant's active default + its preview URL.
  @Get()
  @UseGuards(JwtAuthGuard)
  async list(
    @Req() req: { user: { id: string } },
    @Query('category') category?: string,
  ) {
    const cat = this.parseCategory(category);
    return this.templatesService.listForCategory(req.user.id, cat);
  }

  // Set the tenant's active template for a category (flips CompanyTemplate
  // default via provision-or-reuse of a per-tenant instance). PATCH (not PUT):
  // the app's CORS allowlist + update convention use PATCH, no PUT anywhere.
  @Patch('active')
  @UseGuards(JwtAuthGuard)
  async setActive(
    @Req() req: { user: { id: string } },
    @Body() body: SetActiveTemplateDto,
  ) {
    const items = await this.templatesService.setActive(
      req.user.id,
      body.category,
      body.slug,
    );
    return {
      message: 'Active template updated',
      templates: items,
    };
  }

  // Public: pre-generated PNG preview of a catalog design. Public so an <img>
  // tag loads it cross-origin (dev: :3001 → :3000) without a cookie. Previews
  // are non-sensitive (blank template + sample data), so no auth is required.
  @Get('previews/:file')
  getPreview(@Param('file') file: string, @Res() res: Response) {
    const slug = file.replace(/\.png$/i, '');
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new BadRequestException('Invalid preview name');
    }
    const filePath = path.resolve(
      process.cwd(),
      'assets/templates/previews',
      `${slug}.png`,
    );
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Preview not found');
    }
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    fs.createReadStream(filePath).pipe(res);
  }

  private parseCategory(raw?: string): SelectableCategory {
    const value = (raw ?? 'RECEIPT').toUpperCase();
    const match = SELECTABLE_CATEGORIES.find((c) => c === value);
    if (!match) {
      throw new BadRequestException(
        `Unsupported category "${raw}". Supported: ${SELECTABLE_CATEGORIES.join(', ')}`,
      );
    }
    return match;
  }
}
