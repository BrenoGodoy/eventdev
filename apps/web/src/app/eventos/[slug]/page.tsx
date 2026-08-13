import { EventDetails } from "./EventDetails";

type EventPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;

  return <EventDetails slug={slug} />;
}
