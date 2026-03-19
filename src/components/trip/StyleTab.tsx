import InspirationTab from "./InspirationTab";

interface StyleTabProps {
  tripId: string;
  trip: {
    destination: string;
    country: string | null;
    trip_type: string | null;
    latitude: number | null;
    longitude: number | null;
    start_date: string;
    end_date: string;
    user_id: string;
    trip_theme?: string | null;
  };
  initialSearch?: string;
  initialEventId?: string;
  onClearEventContext?: () => void;
  onBackToEvents?: () => void;
}

const StyleTab = ({ tripId, trip, initialSearch, initialEventId, onClearEventContext, onBackToEvents }: StyleTabProps) => (
  <InspirationTab
    tripId={tripId}
    trip={trip}
    initialSearch={initialSearch}
    initialEventId={initialEventId}
    onClearEventContext={onClearEventContext}
    onBackToEvents={onBackToEvents}
  />
);

export default StyleTab;
