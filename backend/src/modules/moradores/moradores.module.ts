import { Module } from '@nestjs/common';
import { MoradoresService } from './moradores.service';
import { MoradoresController } from './moradores.controller';

@Module({
  controllers: [MoradoresController],
  providers: [MoradoresService],
  exports: [MoradoresService],
})
export class MoradoresModule {}
