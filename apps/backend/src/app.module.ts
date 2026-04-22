import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CompanyProfileModule } from './company-profile/company-profile.module';
import { DocumentsModule } from './documents/documents.module';
import { BillingModule } from './billing/billing.module';
import { AdminModule } from './admin/admin.module';
import { ContactModule } from './contact/contact.module';
import { CustomersModule } from './customers/customers.module';

@Module({
  imports: [
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
  ],
})
export class AppModule {}
