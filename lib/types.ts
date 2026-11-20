export type Source = "iaai" | "copart";
export type Category = "car" | "motorcycle" | "atv";

export type Lot = {
  id: string;
  source: Source;
  category: Category;
  lotNumber: string;
  stockNumber: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  series: string;
  name: string;
  images: string[];
  auctionAt: string;
  timezone: string;
  location: string;
  city: string;
  state: string;
  odometer: number | null;
  odometerUnit: "mi" | "km";
  primaryDamage: string;
  secondaryDamage: string;
  titleDoc: string;
  condition: string;
  keys: string;
  fuel: string;
  transmission: string;
  drive: string;
  engine: string;
  color: string;
  lane: string;
  currentBid: number | null;
  acv: number | null;
  image: string;
  url: string;
};

export type Filters = {
  category: Category | "";
  source: Source | "";
  make: string;
  model: string;
  yearFrom: number | null;
  yearTo: number | null;
  fuel: "" | "gas" | "diesel" | "hybrid" | "electric";
  drive: "" | "awd" | "fwd" | "rwd";
  milesFrom: number | null;
  milesTo: number | null;
  q: string;
  page: number;
};

export type NamedCount = {
  key: string;
  name: string;
  count: number;
};

export type Sale = {
  id: string;
  source: Source;
  category: Category;
  lotNumber: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  name: string;
  price: number | null;
  odometer: number | null;
  odometerUnit: "mi" | "km";
  auctionAt: string;
  city: string;
  state: string;
  location: string;
  image: string;
  url: string;
  titleDoc: string;
};

export type SaleSummary = {
  count: number;
  average: number | null;
  min: number | null;
  max: number | null;
};
