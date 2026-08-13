import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { TicketmasterService } from './ticketmaster.service';

describe('CatalogService', () => {
  const hasApiKey = jest.fn();
  const searchAttractions = jest.fn();
  const findAttraction = jest.fn();
  const ticketmaster = {
    hasApiKey,
    searchAttractions,
    findAttraction,
  } as unknown as TicketmasterService;
  const service = new CatalogService(ticketmaster);

  beforeEach(() => {
    hasApiKey.mockReset();
    searchAttractions.mockReset();
    findAttraction.mockReset();
  });

  it('uses the local development catalog when no API key exists', async () => {
    hasApiKey.mockReturnValue(false);

    const result = await service.searchAttractions('Coldplay');

    expect(result.source).toBe('DEMO');
    expect(result.attractions[0]).toEqual(
      expect.objectContaining({ externalId: 'demo-coldplay' }),
    );
  });

  it('delegates searches to Ticketmaster when the API key exists', async () => {
    hasApiKey.mockReturnValue(true);
    searchAttractions.mockResolvedValue([]);

    const result = await service.searchAttractions('Coldplay');

    expect(searchAttractions).toHaveBeenCalledWith('Coldplay');
    expect(result.source).toBe('TICKETMASTER');
  });

  it('requires at least two characters', async () => {
    await expect(service.searchAttractions('c')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('does not accept an unknown local attraction when publishing', async () => {
    hasApiKey.mockReturnValue(false);

    await expect(service.findAttraction('unknown')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
