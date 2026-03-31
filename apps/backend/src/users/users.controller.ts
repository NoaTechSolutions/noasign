import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAccountRequestDto } from './dto/create-account-request.dto';
import { UpdateAccountRequestStatusDto } from './dto/update-account-request-status.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: any) {
    return this.usersService.getMe(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async listUsers(@Req() req: any) {
    return this.usersService.listUsers(req.user.id);
  }

  @Get('account-requests')
  @UseGuards(JwtAuthGuard)
  async listAccountRequests(@Req() req: any) {
    return this.usersService.listAccountRequests(req.user.id);
  }

  @Post('account-requests')
  async createAccountRequest(@Body() body: CreateAccountRequestDto) {
    return this.usersService.createAccountRequest(body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('account-requests/:requestId')
  async updateAccountRequestStatus(
    @Req() req: any,
    @Param('requestId', new ParseUUIDPipe()) requestId: string,
    @Body() body: UpdateAccountRequestStatusDto,
  ) {
    return this.usersService.updateAccountRequestStatus(
      req.user.id,
      requestId,
      body,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createUser(@Req() req: any, @Body() body: CreateUserDto) {
    return this.usersService.createUser(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':userId')
  async updateUser(
    @Req() req: any,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() body: UpdateUserDto,
  ) {
    return this.usersService.updateUser(req.user.id, userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':userId/deactivate')
  async deactivateUser(
    @Req() req: any,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    return this.usersService.updateUser(req.user.id, userId, {
      status: UserStatus.INACTIVE,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post(':userId/reactivate')
  async reactivateUser(
    @Req() req: any,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    return this.usersService.updateUser(req.user.id, userId, {
      status: UserStatus.ACTIVE,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post(':userId/password')
  async resetUserPassword(
    @Req() req: any,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() body: ResetUserPasswordDto,
  ) {
    return this.usersService.resetUserPassword(req.user.id, userId, body);
  }
}
