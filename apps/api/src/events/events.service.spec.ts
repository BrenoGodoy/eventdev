import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from './events.service';

describe('EventsService', () => {
  const findMany = jest.fn();
  const findFirst = jest.fn();
  const prisma = {
    event: { findFirst, findMany },
  } as unknown as PrismaService;
  const service = new EventsService(prisma);

  beforeEach(() => {
    findMany.mockReset();
    findMany.mockResolvedValue([]);
    findFirst.mockReset();
    findFirst.mockResolvedValue(null);
  });

  it('filters published events by Brazilian state and maximum price', async () => {
    await service.findAll({ state: 'sp', maxPrice: '100' });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: EventStatus.PUBLISHED,
          state: 'SP',
          price: { lte: 100 },
        },
      }),
    );
  });

  it('creates an exclusive interval for the selected date', async () => {
    await service.findAll({ date: '2026-11-08' });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: EventStatus.PUBLISHED,
          date: {
            gte: new Date('2026-11-08T00:00:00.000Z'),
            lt: new Date('2026-11-09T00:00:00.000Z'),
          },
        },
      }),
    );
  });

  it('rejects a location outside the Brazilian states list', async () => {
    await expect(service.findAll({ state: 'XX' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(findMany).not.toHaveBeenCalled();
  });

  it('loads only published featured events in curated order', async () => {
    await service.findFeatured();

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          featured: true,
          status: EventStatus.PUBLISHED,
        },
        orderBy: [{ featuredOrder: 'asc' }, { date: 'asc' }],
      }),
    );
  });

  it('loads a published event by slug', async () => {
    findFirst.mockResolvedValue({
      id: 'event-1',
      slug: 'aurora-live-sessions',
      title: 'Aurora Live Sessions',
      description: '**Uma noite especial.**',
      category: 'Musica',
      date: new Date('2026-09-19T22:00:00.000Z'),
      venue: 'Casa Aurora',
      city: 'Sao Paulo',
      state: 'SP',
      imageUrl: '/events/aurora-live.png',
      imageAlt: 'Palco do evento Aurora Live Sessions',
      mode: 'IN_PERSON',
      price: { toString: () => '129' },
      featured: true,
      featuredOrder: 2,
    });

    const result = await service.findOne('aurora-live-sessions');

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          slug: 'aurora-live-sessions',
          status: EventStatus.PUBLISHED,
        },
      }),
    );
    expect(result.event).toEqual(
      expect.objectContaining({
        slug: 'aurora-live-sessions',
        price: 129,
      }),
    );
  });

  it('does not expose draft or unknown events', async () => {
    await expect(service.findOne('evento-inexistente')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
