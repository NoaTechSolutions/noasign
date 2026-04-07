import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BillingSummaryQueryDto } from './dto/billing-summary-query.dto';

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('current-usage')
  async getCurrentUsage(@Req() req: any) {
    return this.billingService.getCurrentUsage(req.user.id);
  }

  @Get('summary')
  async getMonthlySummary(@Req() req: any, @Query() query: BillingSummaryQueryDto) {
    return this.billingService.getMonthlySummary(req.user.id, query.month);
  }
}
