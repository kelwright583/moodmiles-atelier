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
}

const StyleTab = ({ tripId, trip, initialSearch, initialEventId }: StyleTabProps) => (
  <InspirationTab
    tripId={tripId}
    trip={trip}
    initialSearch={initialSearch}
    initialEventId={initialEventId}
  />
);

export default StyleTab;
