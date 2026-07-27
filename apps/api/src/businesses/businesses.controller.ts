import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { SearchBusinessesDto } from './dto/search-businesses.dto';
import { CreateBusinessDto } from './dto/create-business.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';

@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businesses: BusinessesService) {}

  @Get()
  search(@Query() filters: SearchBusinessesDto) {
    return this.businesses.search(filters);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.businesses.findBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateBusinessDto, @CurrentUser() user: RequestUser) {
    return this.businesses.create(dto, user.userId);
  }
}
