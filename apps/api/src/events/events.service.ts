import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  CatalogProvider,
  EventMode,
  EventStatus,
  Prisma,
} from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { CatalogService } from '../catalog/catalog.service';
import { PrismaService } from '../prisma/prisma.service';

type EventFilters = {
  query?: string;
  state?: string;
  date?: string;
  maxPrice?: string;
};

export const BRAZILIAN_STATES = new Set([
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
]);

const eventSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  category: true,
  date: true,
  venue: true,
  city: true,
  state: true,
  imageUrl: true,
  imageAlt: true,
  catalogProvider: true,
  catalogExternalId: true,
  mode: true,
  price: true,
  capacity: true,
  availableQuantity: true,
  featured: true,
  featuredOrder: true,
  status: true,
  createdAt: true,
  ticketTiers: {
    where: { active: true },
    orderBy: { price: 'asc' },
    select: {
      id: true,
      type: true,
      name: true,
      description: true,
      price: true,
      capacity: true,
      availableQuantity: true,
    },
  },
} satisfies Prisma.EventSelect;

export type CreateOrganizerEventInput = {
  externalId?: string;
  title?: string;
  description?: string;
  category?: string;
  date?: string;
  venue?: string;
  city?: string;
  state?: string;
  price?: number | string;
  capacity?: number | string;
  availableQuantity?: number | string;
};

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogService: CatalogService,
  ) {}

  async findAll(filters: EventFilters) {
    const where = this.buildWhere(filters);
    const events = await this.prisma.event.findMany({
      where,
      orderBy: [{ date: 'asc' }, { title: 'asc' }],
      select: eventSelect,
    });

    return {
      events: events.map((event) => this.serialize(event)),
      total: events.length,
      filters: {
        query: filters.query?.trim() ?? '',
        state: filters.state?.trim().toUpperCase() ?? '',
        date: filters.date?.trim() ?? '',
        maxPrice: filters.maxPrice?.trim() ?? '',
      },
    };
  }

  async findFeatured() {
    const events = await this.prisma.event.findMany({
      where: {
        featured: true,
        status: EventStatus.PUBLISHED,
      },
      orderBy: [{ featuredOrder: 'asc' }, { date: 'asc' }],
      select: eventSelect,
    });

    return {
      events: events.map((event) => this.serialize(event)),
      total: events.length,
    };
  }

  async findOne(slug: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        slug,
        status: EventStatus.PUBLISHED,
      },
      select: eventSelect,
    });

    if (!event) {
      throw new NotFoundException('Evento nao encontrado.');
    }

    return { event: this.serialize(event) };
  }

  async findMine(organizerId: string) {
    const events = await this.prisma.event.findMany({
      where: { organizerId },
      orderBy: [{ createdAt: 'desc' }, { date: 'asc' }],
      select: eventSelect,
    });

    return {
      events: events.map((event) => this.serialize(event)),
      total: events.length,
    };
  }

  async createForOrganizer(
    organizer: AuthUser,
    input: CreateOrganizerEventInput,
  ) {
    const externalId = this.requiredText(
      input.externalId,
      'Selecione uma atracao do catalogo.',
      160,
    );
    const attraction = await this.catalogService.findAttraction(externalId);
    const title = this.requiredText(
      input.title,
      'Informe o nome do evento.',
      140,
    );
    const description = this.requiredText(
      input.description,
      'Informe a descricao do evento.',
      10_000,
    );
    const category = this.requiredText(
      input.category,
      'Informe a categoria do evento.',
      80,
    );
    const date = this.parseEventDate(input.date);
    const venue = this.requiredText(
      input.venue,
      'Informe o local do evento.',
      160,
    );
    const city = this.requiredText(
      input.city,
      'Informe a cidade do evento.',
      100,
    );
    const state = this.validateState(input.state);
    const price = this.parseMoney(input.price);
    const capacity = this.parseInteger(
      input.capacity,
      'Capacidade deve ser um numero inteiro maior ou igual a dois.',
      2,
    );
    const availableQuantity = this.parseInteger(
      input.availableQuantity,
      'Quantidade disponivel deve ser um numero inteiro positivo ou zero.',
      0,
    );

    if (availableQuantity > capacity) {
      throw new BadRequestException(
        'Quantidade disponivel nao pode superar a capacidade.',
      );
    }

    const slug = this.createSlug(title);
    const generalCapacity = Math.max(1, Math.floor(capacity * 0.8));
    const premiumCapacity = Math.max(1, capacity - generalCapacity);
    const generalAvailable = Math.min(generalCapacity, availableQuantity);
    const premiumAvailable = Math.min(
      premiumCapacity,
      Math.max(0, availableQuantity - generalAvailable),
    );
    const event = await this.prisma.event.create({
      data: {
        slug,
        title,
        description,
        category,
        catalogProvider: CatalogProvider.TICKETMASTER,
        catalogExternalId: attraction.externalId,
        catalogSnapshot: {
          provider: attraction.provider,
          attraction,
          importedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
        date,
        venue,
        city,
        state,
        imageUrl: attraction.imageUrl,
        imageAlt: attraction.imageAlt,
        mode: EventMode.IN_PERSON,
        price,
        capacity,
        availableQuantity,
        featured: false,
        status: EventStatus.PUBLISHED,
        organizerId: organizer.id,
        ticketTiers: {
          create: [
            {
              type: 'GENERAL',
              name: 'Pista',
              description: 'Acesso a pista e a toda a programacao principal.',
              price,
              capacity: generalCapacity,
              availableQuantity: generalAvailable,
            },
            {
              type: 'PREMIUM',
              name: 'Pista Premium',
              description:
                'Area exclusiva mais proxima do palco, com entrada dedicada.',
              price: Math.round(price * 1.6 * 100) / 100,
              capacity: premiumCapacity,
              availableQuantity: premiumAvailable,
            },
          ],
        },
      },
      select: eventSelect,
    });

    return { event: this.serialize(event) };
  }

  private buildWhere(filters: EventFilters): Prisma.EventWhereInput {
    const query = filters.query?.trim();
    const state = filters.state?.trim().toUpperCase();
    const date = filters.date?.trim();
    const maxPrice = filters.maxPrice?.trim();
    const where: Prisma.EventWhereInput = {
      status: EventStatus.PUBLISHED,
    };

    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
        { venue: { contains: query, mode: 'insensitive' } },
        { city: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (state) {
      if (!BRAZILIAN_STATES.has(state)) {
        throw new BadRequestException('Estado deve ser uma UF brasileira.');
      }

      where.state = state;
    }

    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new BadRequestException('Data deve estar no formato YYYY-MM-DD.');
      }

      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      where.date = { gte: start, lt: end };
    }

    if (maxPrice) {
      const parsedMaxPrice = Number(maxPrice.replace(',', '.'));

      if (!Number.isFinite(parsedMaxPrice) || parsedMaxPrice < 0) {
        throw new BadRequestException(
          'Preco maximo deve ser um valor positivo.',
        );
      }

      where.price = { lte: parsedMaxPrice };
    }

    return where;
  }

  private requiredText(
    value: string | undefined,
    message: string,
    maxLength: number,
  ) {
    const normalized = value?.trim();

    if (!normalized) {
      throw new BadRequestException(message);
    }

    if (normalized.length > maxLength) {
      throw new BadRequestException(
        `${message.replace(/\.$/, '')} Limite de ${maxLength} caracteres.`,
      );
    }

    return normalized;
  }

  private parseEventDate(value?: string) {
    if (!value) {
      throw new BadRequestException('Informe a data e o horario do evento.');
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Data e horario do evento sao invalidos.');
    }

    if (date.getTime() <= Date.now()) {
      throw new BadRequestException('O evento deve acontecer no futuro.');
    }

    return date;
  }

  private validateState(value?: string) {
    const state = value?.trim().toUpperCase();

    if (!state || !BRAZILIAN_STATES.has(state)) {
      throw new BadRequestException('Estado deve ser uma UF brasileira.');
    }

    return state;
  }

  private parseMoney(value?: number | string) {
    const parsed = Number(String(value ?? '').replace(',', '.'));

    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 99999999.99) {
      throw new BadRequestException('Preco deve ser um valor positivo valido.');
    }

    return parsed;
  }

  private parseInteger(
    value: number | string | undefined,
    message: string,
    minimum: number,
  ) {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < minimum) {
      throw new BadRequestException(message);
    }

    return parsed;
  }

  private createSlug(title: string) {
    const base = title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 72);

    return `${base || 'evento'}-${randomUUID().slice(0, 8)}`;
  }

  private serialize(event: {
    id: string;
    slug: string;
    title: string;
    description: string;
    category: string;
    date: Date;
    venue: string;
    city: string;
    state: string;
    imageUrl: string;
    imageAlt: string;
    catalogProvider: string | null;
    catalogExternalId: string | null;
    mode: string;
    price: Prisma.Decimal;
    capacity: number;
    availableQuantity: number;
    featured: boolean;
    featuredOrder: number | null;
    status: string;
    createdAt: Date;
    ticketTiers: Array<{
      id: string;
      type: string;
      name: string;
      description: string;
      price: Prisma.Decimal;
      capacity: number;
      availableQuantity: number;
    }>;
  }) {
    return {
      ...event,
      date: event.date.toISOString(),
      price: Number(event.price),
      createdAt: event.createdAt.toISOString(),
      ticketTiers: event.ticketTiers.map((tier) => ({
        ...tier,
        price: Number(tier.price),
      })),
    };
  }
}
