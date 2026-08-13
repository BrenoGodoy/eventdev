import { Controller, Get, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { CatalogService } from './catalog.service';

@Controller('catalog')
@Roles(UserRole.ORGANIZER)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('attractions')
  searchAttractions(@Query('query') query: string) {
    return this.catalogService.searchAttractions(query);
  }
}
