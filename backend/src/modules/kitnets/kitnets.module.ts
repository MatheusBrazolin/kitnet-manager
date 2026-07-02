import { Module } from '@nestjs/common';
import { KitnetsService } from './kitnets.service';
import { KitnetsController } from './kitnets.controller';

@Module({
  controllers: [KitnetsController],
  providers: [KitnetsService],
  exports: [KitnetsService],
})
export class KitnetsModule {}
