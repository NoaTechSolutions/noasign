import { Module } from '@nestjs/common';
import { R2Service } from './r2.service';

/**
 * Provides R2-backed document storage. Not yet imported by any feature module —
 * the service is wired and ready; consumers (receipts/documents) will import
 * this module when PDF persistence lands. See docs/architecture/pdf-storage-r2.md.
 */
@Module({
  providers: [R2Service],
  exports: [R2Service],
})
export class StorageModule {}
