import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ViewerReadOnlyGuard } from '../../common/guards/viewer-read-only.guard';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { KitnetsService } from './kitnets.service';
import { CreateKitnetDto } from './dto/create-kitnet.dto';
import { UpdateKitnetDto } from './dto/update-kitnet.dto';

@UseGuards(JwtAuthGuard, ViewerReadOnlyGuard)
@Controller('kitnets')
export class KitnetsController {
  constructor(private readonly kitnetsService: KitnetsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.kitnetsService.findAll(user.contaId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.kitnetsService.findDetail(user.contaId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateKitnetDto) {
    return this.kitnetsService.create(user.contaId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateKitnetDto,
  ) {
    return this.kitnetsService.update(user.contaId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.kitnetsService.remove(user.contaId, id);
  }
}
