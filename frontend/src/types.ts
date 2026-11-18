export type Role = "participant" | "moderator" | "admin";
export type Page = "home" | "events" | "polls" | "people" | "manage";

export interface EventItem {
  id: number;
  title: string;
  description: string;
  place: string;
  date: string;
  time: string;
  accent: "Обычное" | "Важное";
  category: string;
  registered: boolean;
  image: string;
}

export interface PollOption {
  id: number;
  text: string;
  votes: number;
}

export interface PollItem {
  id: number;
  title: string;
  description: string;
  type: "single" | "multiple";
  deadline: string;
  options: PollOption[];
  voted: boolean;
}
