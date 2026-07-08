import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { KitnetsService } from './kitnets.service';
import { CreateKitnetDto } from './dto/create-kitnet.dto';
import { UpdateKitnetDto } from './dto/update-kitnet.dto';

@UseGuards(JwtAuthGuard)
@Controller('kitnets')
export class KitnetsController {
  constructor(private readonly kitnetsService: KitnetsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.kitnetsService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.kitnetsService.findDetail(user.id, id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateKitnetDto) {
    return this.kitnetsService.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateKitnetDto,
  ) {
    return this.kitnetsService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.kitnetsService.remove(user.id, id);
  }
}
