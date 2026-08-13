import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { demoAttractions } from './demo-attractions';
import { TicketmasterService } from './ticketmaster.service';

@Injectable()
export class CatalogService {
  constructor(private readonly ticketmaster: TicketmasterService) {}

  async searchAttractions(rawQuery: string) {
    const query = rawQuery?.trim();

    if (!query || query.length < 2) {
      throw new BadRequestException(
        'A busca deve conter pelo menos dois caracteres.',
      );
    }

    if (this.ticketmaster.hasApiKey()) {
      return {
        attractions: await this.ticketmaster.searchAttractions(query),
        source: 'TICKETMASTER' as const,
        notice: null,
      };
    }

    const normalizedQuery = this.normalizeText(query);
    return {
      attractions: demoAttractions.filter((attraction) =>
        this.normalizeText(
          [attraction.name, attraction.category, attraction.genre]
            .filter(Boolean)
            .join(' '),
        ).includes(normalizedQuery),
      ),
      source: 'DEMO' as const,
      notice:
        'TICKETMASTER_API_KEY ausente. Catalogo local de desenvolvimento ativo.',
    };
  }

  async findAttraction(externalId: string) {
    if (this.ticketmaster.hasApiKey()) {
      return this.ticketmaster.findAttraction(externalId);
    }

    const attraction = demoAttractions.find(
      (item) => item.externalId === externalId,
    );

    if (!attraction) {
      throw new NotFoundException('Atracao nao encontrada no catalogo.');
    }

    return attraction;
  }

  private normalizeText(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}
