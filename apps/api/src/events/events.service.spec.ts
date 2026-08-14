import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogService } from '../catalog/catalog.service';
import { EventsService } from './events.service';

describe('EventsService', () => {
  const findMany = jest.fn();
  const findFirst = jest.fn();
  const create = jest.fn();
  const transaction = jest.fn();
  const prisma = {
    event: { create, findFirst, findMany },
    $transaction: transaction,
  } as unknown as PrismaService;
  const findAttraction = jest.fn();
  const catalogService = { findAttraction } as unknown as CatalogService;
  const service = new EventsService(prisma, catalogService);

  beforeEach(() => {
    findMany.mockReset();
    findMany.mockResolvedValue([]);
    findFirst.mockReset();
    findFirst.mockResolvedValue(null);
    create.mockReset();
    transaction.mockReset();
    findAttraction.mockReset();
    findAttraction.mockResolvedValue({
      provider: 'TICKETMASTER',
      externalId: 'demo-coldplay',
      name: 'Coldplay',
      imageUrl: '/events/aurora-live.png',
      imageAlt: 'Imagem de Coldplay',
      category: 'Música',
      genre: 'Rock',
      subGenre: 'Alternative Rock',
      sourceUrl: null,
      locale: 'en-us',
      upcomingEvents: 10,
    });
  });

  it('filters published events by Brazilian state and maximum price', async () => {
    await service.findAll({ state: 'sp', maxPrice: '100' });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: EventStatus.PUBLISHED,
          state: 'SP',
          price: { lte: 100 },
          date: { gt: expect.any(Date) },
        }),
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
            gte: new Date('2026-11-08T03:00:00.000Z'),
            lt: new Date('2026-11-09T03:00:00.000Z'),
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
        where: expect.objectContaining({
          featured: true,
          status: EventStatus.PUBLISHED,
          date: { gt: expect.any(Date) },
        }),
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
      category: 'Música',
      date: new Date('2026-09-19T22:00:00.000Z'),
      venue: 'Casa Aurora',
      city: 'São Paulo',
      state: 'SP',
      imageUrl: '/events/aurora-live.png',
      imageAlt: 'Palco do evento Aurora Live Sessions',
      catalogProvider: null,
      catalogExternalId: null,
      mode: 'IN_PERSON',
      price: { toString: () => '129' },
      capacity: 500,
      availableQuantity: 500,
      featured: true,
      featuredOrder: 2,
      status: 'PUBLISHED',
      createdAt: new Date('2026-08-12T12:00:00.000Z'),
      ticketTiers: [
        {
          id: 'tier-general',
          type: 'GENERAL',
          name: 'Pista',
          description: 'Entrada geral',
          price: { toString: () => '129' },
          capacity: 400,
          availableQuantity: 400,
        },
      ],
    });

    const result = await service.findOne('aurora-live-sessions');

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          slug: 'aurora-live-sessions',
          status: EventStatus.PUBLISHED,
          date: { gt: expect.any(Date) },
        }),
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

  it('lists only events owned by the authenticated organizer', async () => {
    await service.findMine('organizer-1');

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizerId: 'organizer-1' },
      }),
    );
  });

  it('rejects inventory above the event capacity', async () => {
    await expect(
      service.createForOrganizer(
        {
          id: 'organizer-1',
          name: 'Organizador',
          email: 'organizer@example.com',
          role: 'ORGANIZER',
        },
        {
          externalId: 'demo-coldplay',
          title: 'Coldplay no Brasil',
          description: 'Descrição completa do evento.',
          category: 'Rock',
          date: '2099-09-20T22:00:00.000Z',
          venue: 'Arena EventDev',
          city: 'São Paulo',
          state: 'SP',
          price: 250,
          capacity: 100,
          availableQuantity: 120,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it('publishes the event with the authenticated organizer and catalog snapshot', async () => {
    create.mockResolvedValue({
      id: 'event-1',
      slug: 'coldplay-no-brasil-12345678',
      title: 'Coldplay no Brasil',
      description: 'Descrição completa do evento.',
      category: 'Rock',
      date: new Date('2099-09-20T22:00:00.000Z'),
      venue: 'Arena EventDev',
      city: 'São Paulo',
      state: 'SP',
      imageUrl: '/events/aurora-live.png',
      imageAlt: 'Imagem de Coldplay',
      catalogProvider: 'TICKETMASTER',
      catalogExternalId: 'demo-coldplay',
      mode: 'IN_PERSON',
      price: { toString: () => '250' },
      capacity: 100,
      availableQuantity: 100,
      featured: false,
      featuredOrder: null,
      status: 'PUBLISHED',
      createdAt: new Date('2026-08-13T12:00:00.000Z'),
      ticketTiers: [],
    });

    await service.createForOrganizer(
      {
        id: 'organizer-1',
        name: 'Organizador',
        email: 'organizer@example.com',
        role: 'ORGANIZER',
      },
      {
        externalId: 'demo-coldplay',
        title: 'Coldplay no Brasil',
        description: 'Descrição completa do evento.',
        category: 'Rock',
        date: '2099-09-20T22:00:00.000Z',
        venue: 'Arena EventDev',
        city: 'São Paulo',
        state: 'SP',
        price: 250,
        capacity: 100,
        availableQuantity: 100,
      },
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizerId: 'organizer-1',
          catalogExternalId: 'demo-coldplay',
          status: EventStatus.PUBLISHED,
          capacity: 100,
          availableQuantity: 100,
          ticketTiers: {
            create: [
              expect.objectContaining({
                type: 'GENERAL',
                price: 250,
                capacity: 80,
                availableQuantity: 80,
              }),
              expect.objectContaining({
                type: 'PREMIUM',
                price: 400,
                capacity: 20,
                availableQuantity: 20,
              }),
            ],
          },
        }),
      }),
    );
  });

  it('fills general admission before premium when initial inventory is partial', async () => {
    create.mockResolvedValue({
      id: 'event-2',
      slug: 'evento-parcial-12345678',
      title: 'Evento parcial',
      description: 'Descrição completa do evento.',
      category: 'Show',
      date: new Date('2099-09-20T22:00:00.000Z'),
      venue: 'Arena EventDev',
      city: 'São Paulo',
      state: 'SP',
      imageUrl: '/events/aurora-live.png',
      imageAlt: 'Imagem do evento',
      catalogProvider: 'TICKETMASTER',
      catalogExternalId: 'demo-coldplay',
      mode: 'IN_PERSON',
      price: { toString: () => '100' },
      capacity: 100,
      availableQuantity: 50,
      featured: false,
      featuredOrder: null,
      status: 'PUBLISHED',
      createdAt: new Date('2026-08-13T12:00:00.000Z'),
      ticketTiers: [],
    });

    await service.createForOrganizer(
      {
        id: 'organizer-1',
        name: 'Organizador',
        email: 'organizer@example.com',
        role: 'ORGANIZER',
      },
      {
        externalId: 'demo-coldplay',
        title: 'Evento parcial',
        description: 'Descrição completa do evento.',
        category: 'Show',
        date: '2099-09-20T22:00:00.000Z',
        venue: 'Arena EventDev',
        city: 'São Paulo',
        state: 'SP',
        price: 100,
        capacity: 100,
        availableQuantity: 50,
      },
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ticketTiers: {
            create: [
              expect.objectContaining({
                type: 'GENERAL',
                capacity: 80,
                availableQuantity: 50,
              }),
              expect.objectContaining({
                type: 'PREMIUM',
                capacity: 20,
                availableQuantity: 0,
              }),
            ],
          },
        }),
      }),
    );
  });

  it('does not reduce capacity below inventory already committed by reservations', async () => {
    transaction.mockImplementation((callback) =>
      callback({
        event: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'event-1',
            status: EventStatus.PUBLISHED,
            ticketTiers: [
              { id: 'tier-general', type: 'GENERAL' },
              { id: 'tier-premium', type: 'PREMIUM' },
            ],
          }),
        },
        reservationItem: {
          groupBy: jest.fn().mockResolvedValue([
            { tierId: 'tier-general', _sum: { quantity: 8 } },
            { tierId: 'tier-premium', _sum: { quantity: 3 } },
          ]),
        },
      }),
    );

    await expect(
      service.updateForOrganizer('organizer-1', 'event-1', {
        title: 'Evento atualizado',
        description: 'Descrição completa do evento atualizado.',
        category: 'Show',
        date: '2099-09-20T22:00:00.000Z',
        venue: 'Arena EventDev',
        city: 'São Paulo',
        state: 'SP',
        price: 100,
        capacity: 10,
        availableQuantity: 0,
      }),
    ).rejects.toThrow('11 ingressos reservados ou vendidos');
  });

  it('cancels the event and all active operational records atomically', async () => {
    const updateEvent = jest.fn().mockResolvedValue({});
    const updateTickets = jest.fn().mockResolvedValue({ count: 2 });
    const updateReservations = jest.fn().mockResolvedValue({ count: 1 });
    const updateShares = jest.fn().mockResolvedValue({ count: 1 });
    const updateTiers = jest.fn().mockResolvedValue({ count: 2 });
    const canceledEvent = {
      id: 'event-1',
      slug: 'evento-cancelado',
      title: 'Evento cancelado',
      description: 'Descrição completa do evento.',
      category: 'Show',
      date: new Date('2099-09-20T22:00:00.000Z'),
      venue: 'Arena EventDev',
      city: 'São Paulo',
      state: 'SP',
      imageUrl: '/events/aurora-live.png',
      imageAlt: 'Imagem do evento',
      catalogProvider: 'TICKETMASTER',
      catalogExternalId: 'demo-coldplay',
      mode: 'IN_PERSON',
      price: { toString: () => '100' },
      capacity: 100,
      availableQuantity: 0,
      featured: false,
      featuredOrder: null,
      status: EventStatus.CANCELED,
      createdAt: new Date('2026-08-13T12:00:00.000Z'),
      ticketTiers: [],
    };

    transaction.mockImplementation((callback) =>
      callback({
        event: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'event-1',
            status: EventStatus.PUBLISHED,
          }),
          update: updateEvent,
          findUniqueOrThrow: jest.fn().mockResolvedValue(canceledEvent),
        },
        shareToken: { updateMany: updateShares },
        ticket: { updateMany: updateTickets },
        reservation: { updateMany: updateReservations },
        eventTicketTier: { updateMany: updateTiers },
      }),
    );

    const result = await service.cancelForOrganizer('organizer-1', 'event-1');

    expect(result.event.status).toBe(EventStatus.CANCELED);
    expect(updateShares).toHaveBeenCalledTimes(1);
    expect(updateTickets).toHaveBeenCalledTimes(1);
    expect(updateReservations).toHaveBeenCalledTimes(2);
    expect(updateTiers).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { active: false, availableQuantity: 0 },
      }),
    );
    expect(updateEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: EventStatus.CANCELED }),
      }),
    );
  });
});
