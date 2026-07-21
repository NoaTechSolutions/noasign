import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
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
  private readonly logger = new Logger(TemplatesController.name);

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
      // Expected for any template whose preview PNG hasn't been curated yet (a
      // custom per-tenant template — see saas-ux-patterns §10). The frontend shows
      // an honest "no preview" placeholder. NOT an error, so it isn't logged.
      throw new NotFoundException('Preview not found');
    }
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      // The file EXISTS but couldn't be read (permissions, corruption). That IS a
      // real problem the placeholder would otherwise hide — make it loud, so the
      // graceful UI fallback never masks a broken deploy/asset.
      this.logger.error(
        `Preview "${slug}.png" exists but failed to read: ${err.message}`,
      );
      if (!res.headersSent) res.status(500).end();
      else res.destroy();
    });
    stream.pipe(res);
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
