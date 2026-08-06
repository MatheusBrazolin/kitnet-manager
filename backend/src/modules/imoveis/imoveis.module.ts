import { Module } from '@nestjs/common';
import { ImoveisService } from './imoveis.service';
import { ImoveisController } from './imoveis.controller';

@Module({
  controllers: [ImoveisController],
  providers: [ImoveisService],
  exports: [ImoveisService],
})
export class ImoveisModule {}
