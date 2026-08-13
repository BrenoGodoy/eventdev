import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { CatalogAttraction } from './catalog.types';

type TicketmasterImage = {
  url?: string;
  ratio?: string;
  width?: number;
  height?: number;
};

type TicketmasterClassification = {
  primary?: boolean;
  segment?: { name?: string };
  genre?: { name?: string };
  subGenre?: { name?: string };
};

type TicketmasterAttraction = {
  id?: string;
  name?: string;
  url?: string;
  locale?: string;
  images?: TicketmasterImage[];
  classifications?: TicketmasterClassification[];
  upcomingEvents?: { _total?: number };
};

type TicketmasterSearchResponse = {
  _embedded?: {
    attractions?: TicketmasterAttraction[];
  };
};

@Injectable()
export class TicketmasterService {
  private readonly baseUrl =
    process.env.TICKETMASTER_API_BASE_URL ??
    'https://app.ticketmaster.com/discovery/v2';

  hasApiKey() {
    return Boolean(process.env.TICKETMASTER_API_KEY?.trim());
  }

  async searchAttractions(query: string) {
    const response = await this.request<TicketmasterSearchResponse>(
      '/attractions.json',
      {
        keyword: query,
        locale: '*',
        size: '12',
      },
    );

    return (response._embedded?.attractions ?? [])
      .map((attraction) => this.normalize(attraction))
      .filter((attraction): attraction is CatalogAttraction => Boolean(attraction));
  }

  async findAttraction(externalId: string) {
    const response = await this.request<TicketmasterAttraction>(
      `/attractions/${encodeURIComponent(externalId)}.json`,
    );
    const attraction = this.normalize(response);

    if (!attraction) {
      throw new ServiceUnavailableException(
        'A Ticketmaster retornou uma atracao incompleta.',
      );
    }

    return attraction;
  }

  private async request<T>(path: string, params: Record<string, string> = {}) {
    const apiKey = process.env.TICKETMASTER_API_KEY?.trim();

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'TICKETMASTER_API_KEY nao foi configurada.',
      );
    }

    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set('apikey', apiKey);
    Object.entries(params).forEach(([key, value]) =>
      url.searchParams.set(key, value),
    );

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8_000),
      });

      if (!response.ok) {
        throw new Error(`Ticketmaster respondeu com status ${response.status}.`);
      }

      return (await response.json()) as T;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha desconhecida.';
      throw new ServiceUnavailableException(
        `Nao foi possivel consultar a Ticketmaster. ${message}`,
      );
    }
  }

  private normalize(
    attraction: TicketmasterAttraction,
  ): CatalogAttraction | null {
    if (!attraction.id || !attraction.name) {
      return null;
    }

    const classification =
      attraction.classifications?.find((item) => item.primary) ??
      attraction.classifications?.[0];
    const segment = this.cleanTaxonomy(classification?.segment?.name);
    const genre = this.cleanTaxonomy(classification?.genre?.name);
    const subGenre = this.cleanTaxonomy(classification?.subGenre?.name);
    const image = this.pickImage(attraction.images ?? []);

    return {
      provider: 'TICKETMASTER',
      externalId: attraction.id,
      name: attraction.name,
      imageUrl: image?.url ?? '/events/horizonte-conference.png',
      imageAlt: `Imagem oficial de ${attraction.name} no catalogo Ticketmaster`,
      category: genre ?? segment ?? 'Evento',
      genre,
      subGenre,
      sourceUrl: attraction.url ?? null,
      locale: attraction.locale ?? null,
      upcomingEvents: attraction.upcomingEvents?._total ?? null,
    };
  }

  private pickImage(images: TicketmasterImage[]) {
    return [...images]
      .filter((image) => image.url)
      .sort((left, right) => {
        const leftRatio = left.ratio === '16_9' ? 1 : 0;
        const rightRatio = right.ratio === '16_9' ? 1 : 0;
        return rightRatio - leftRatio || (right.width ?? 0) - (left.width ?? 0);
      })[0];
  }

  private cleanTaxonomy(value?: string) {
    if (!value || value.toLowerCase() === 'undefined') {
      return null;
    }

    return value;
  }
}
