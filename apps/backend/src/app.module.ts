import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { ClearCookieOn401Filter } from './auth/clear-cookie-on-401.filter';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CompanyProfileModule } from './company-profile/company-profile.module';
import { DocumentsModule } from './documents/documents.module';
import { BillingModule } from './billing/billing.module';
import { AdminModule } from './admin/admin.module';
import { ContactModule } from './contact/contact.module';
import { LeadsModule } from './leads/leads.module';
import { CustomersModule } from './customers/customers.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { TemplatesModule } from './templates/templates.module';
import { NotificationsModule } from './notifications/notifications.module';
import { VersionModule } from './version/version.module';
import { LegalModule } from './legal/legal.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    CompanyProfileModule,
    DocumentsModule,
    BillingModule,
    AdminModule,
    ContactModule,
    LeadsModule,
    CustomersModule,
    ReceiptsModule,
    TemplatesModule,
    NotificationsModule,
    VersionModule,
    LegalModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    {
      // Registered AFTER Sentry so this more-specific @Catch(UnauthorizedException)
      // handles 401s (clearing the auth cookie); everything else still reaches the
      // Sentry catch-all above.
      provide: APP_FILTER,
      useClass: ClearCookieOn401Filter,
    },
  ],
})
export class AppModule {}
