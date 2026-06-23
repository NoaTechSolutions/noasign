import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CompanyProfileModule } from './company-profile/company-profile.module';
import { DocumentsModule } from './documents/documents.module';
import { BillingModule } from './billing/billing.module';
import { AdminModule } from './admin/admin.module';
import { ContactModule } from './contact/contact.module';
import { CustomersModule } from './customers/customers.module';
import { ReceiptsModule } from './receipts/receipts.module';
// TEMPORARY — Sentry scrub e2e harness (inert in prod). Remove before prod.
import { DebugSentryModule } from './observability/debug-sentry.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CompanyProfileModule,
    DocumentsModule,
    BillingModule,
    AdminModule,
    ContactModule,
    CustomersModule,
    ReceiptsModule,
    DebugSentryModule, // TEMPORARY — remove before prod
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class AppModule {}
