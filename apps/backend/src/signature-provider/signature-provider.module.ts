import { Module, forwardRef } from '@nestjs/common';
import { BoldSignModule } from '../boldsign/boldsign.module';
import { SignatureProviderService } from './signature-provider.service';

@Module({
  imports: [forwardRef(() => BoldSignModule)],
  providers: [SignatureProviderService],
  exports: [SignatureProviderService],
})
export class SignatureProviderModule {}
