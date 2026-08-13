import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type EventFilters = {
  query?: string;
  state?: string;
  date?: string;
  maxPrice?: string;
};

const BRAZILIAN_STATES = new Set([
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
  mode: true,
  price: true,
  featured: true,
  featuredOrder: true,
} satisfies Prisma.EventSelect;

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

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
    mode: string;
    price: Prisma.Decimal;
    featured: boolean;
    featuredOrder: number | null;
  }) {
    return {
      ...event,
      date: event.date.toISOString(),
      price: Number(event.price),
    };
  }
}
