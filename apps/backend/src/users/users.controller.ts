import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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

  @UseGuards(JwtAuthGuard)
  @Post()
  async createUser(@Req() req: any, @Body() body: CreateUserDto) {
    return this.usersService.createUser(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':userId')
  async updateUser(
    @Req() req: any,
    @Param('userId') userId: string,
    @Body() body: UpdateUserDto,
  ) {
    return this.usersService.updateUser(req.user.id, userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':userId/deactivate')
  async deactivateUser(@Req() req: any, @Param('userId') userId: string) {
    return this.usersService.updateUser(req.user.id, userId, {
      status: UserStatus.INACTIVE,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post(':userId/reactivate')
  async reactivateUser(@Req() req: any, @Param('userId') userId: string) {
    return this.usersService.updateUser(req.user.id, userId, {
      status: UserStatus.ACTIVE,
    });
  }
}
