export type CatalogSource = 'TICKETMASTER' | 'DEMO';

export type CatalogAttraction = {
  provider: 'TICKETMASTER';
  externalId: string;
  name: string;
  imageUrl: string;
  imageAlt: string;
  category: string;
  genre: string | null;
  subGenre: string | null;
  sourceUrl: string | null;
  locale: string | null;
  upcomingEvents: number | null;
};

export type CatalogSearchResult = {
  attractions: CatalogAttraction[];
  source: CatalogSource;
  notice: string | null;
};
