import { CreateEventFlow } from "../../novo/CreateEventFlow";

type EditOrganizerEventPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EditOrganizerEventPage({
  params,
}: EditOrganizerEventPageProps) {
  const { eventId } = await params;

  return <CreateEventFlow eventId={eventId} />;
}
