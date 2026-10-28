import { Module } from '@nestjs/common';
import { ImobiliariasController } from './imobiliarias.controller';
import { ImobiliariasService } from './imobiliarias.service';

@Module({
  controllers: [ImobiliariasController],
  providers: [ImobiliariasService],
  exports: [ImobiliariasService],
})
export class ImobiliariasModule {}
