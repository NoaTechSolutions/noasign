import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CustomersService } from './customers.service';
import type { AuthUser } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

type AuthedRequest = Request & { user: AuthUser };

@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  async create(@Req() req: AuthedRequest, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(req.user, dto);
  }

  @Get()
  async list(
    @Req() req: AuthedRequest,
    @Query() query: ListCustomersQueryDto,
  ) {
    return this.customersService.list(req.user, query);
  }

  // MUST come BEFORE @Get(':id') so the matcher doesn't treat "deleted" as a UUID param.
  @Get('deleted')
  async listDeleted(
    @Req() req: AuthedRequest,
    @Query() query: ListCustomersQueryDto,
  ) {
    return this.customersService.listDeleted(req.user, query);
  }

  @Get(':id')
  async findOne(
    @Req() req: AuthedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.customersService.findOne(req.user, id);
  }

  @Patch(':id')
  async update(
    @Req() req: AuthedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(req.user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Req() req: AuthedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.customersService.delete(req.user, id);
  }

  @Post(':id/restore')
  async restore(
    @Req() req: AuthedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.customersService.restore(req.user, id);
  }
}
