
export interface TeamMemberNote {
  name: string;
  note: string;
  vote: 'up' | 'down' | null;
}

export interface DressEntry {
  id: string;
  location: string;
  price: string;
  image: string | null;
  teamNotes: Record<string, TeamMemberNote>;
}

export interface SyncData {
  entries: DressEntry[];
  lastUpdated: number;
}
