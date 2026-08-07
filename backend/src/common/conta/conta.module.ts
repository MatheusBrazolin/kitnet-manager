import { Global, Module } from '@nestjs/common';
import { ContaService } from './conta.service';

@Global()
@Module({
  providers: [ContaService],
  exports: [ContaService],
})
export class ContaModule {}
