import { Db } from "mongodb";

export type AirportCode = "NZNE" | "YSSY" | "NZRO" | "NZGB" | "NZCI" | "NZTL";

export type Booking = {
  reference: string;
  passengerTitle: string;
  passengerFirstName: string;
  passengerLastName: string;
  passengerEmail: string;
  bookedAt: string;
};

export type Schedule = {
  flightKey: string;
  flightNumber: string;
  aircraft: string;
  capacity: number;
  origin: AirportCode;
  destination: AirportCode;
  departureTime: string;
  arrivalTime: string;
  price: number;
  bookings: Booking[];
};

export const airports: Record<AirportCode, { name: string; city: string; timeZone: string }> = {
  NZNE: { name: "Dairy Flat Airport", city: "Dairy Flat", timeZone: "Pacific/Auckland" },
  YSSY: { name: "Sydney Airport", city: "Sydney", timeZone: "Australia/Sydney" },
  NZRO: { name: "Rotorua Airport", city: "Rotorua", timeZone: "Pacific/Auckland" },
  NZGB: { name: "Claris Airport", city: "Great Barrier Island", timeZone: "Pacific/Auckland" },
  NZCI: { name: "Tuuta Airport", city: "Chatham Islands", timeZone: "Pacific/Chatham" },
  NZTL: { name: "Lake Tekapo Airport", city: "Lake Tekapo", timeZone: "Pacific/Auckland" },
};

type Rule = {
  flightNumber: string;
  aircraft: string;
  capacity: number;
  origin: AirportCode;
  destination: AirportCode;
  weekdays: number[];
  localDeparture: string;
  durationMinutes: number;
  price: number;
};

const rules: Rule[] = [
  {
    flightNumber: "DFA101",
    aircraft: "SyberJet SJ30i",
    capacity: 6,
    origin: "NZNE",
    destination: "YSSY",
    weekdays: [5],
    localDeparture: "10:30",
    durationMinutes: 210,
    price: 890,
  },
  {
    flightNumber: "DFA102",
    aircraft: "SyberJet SJ30i",
    capacity: 6,
    origin: "YSSY",
    destination: "NZNE",
    weekdays: [0],
    localDeparture: "15:30",
    durationMinutes: 230,
    price: 890,
  },
  {
    flightNumber: "DFA201",
    aircraft: "Cirrus SF50 Vision Jet",
    capacity: 4,
    origin: "NZNE",
    destination: "NZRO",
    weekdays: [1, 2, 3, 4, 5],
    localDeparture: "07:15",
    durationMinutes: 45,
    price: 220,
  },
  {
    flightNumber: "DFA202",
    aircraft: "Cirrus SF50 Vision Jet",
    capacity: 4,
    origin: "NZRO",
    destination: "NZNE",
    weekdays: [1, 2, 3, 4, 5],
    localDeparture: "08:25",
    durationMinutes: 50,
    price: 220,
  },
  {
    flightNumber: "DFA203",
    aircraft: "Cirrus SF50 Vision Jet",
    capacity: 4,
    origin: "NZNE",
    destination: "NZRO",
    weekdays: [1, 2, 3, 4, 5],
    localDeparture: "16:45",
    durationMinutes: 45,
    price: 240,
  },
  {
    flightNumber: "DFA204",
    aircraft: "Cirrus SF50 Vision Jet",
    capacity: 4,
    origin: "NZRO",
    destination: "NZNE",
    weekdays: [1, 2, 3, 4, 5],
    localDeparture: "18:00",
    durationMinutes: 50,
    price: 240,
  },
  {
    flightNumber: "DFA301",
    aircraft: "Cirrus SF50 Vision Jet",
    capacity: 4,
    origin: "NZNE",
    destination: "NZGB",
    weekdays: [1, 3, 5],
    localDeparture: "09:00",
    durationMinutes: 35,
    price: 180,
  },
  {
    flightNumber: "DFA302",
    aircraft: "Cirrus SF50 Vision Jet",
    capacity: 4,
    origin: "NZGB",
    destination: "NZNE",
    weekdays: [2, 4, 6],
    localDeparture: "09:40",
    durationMinutes: 40,
    price: 180,
  },
  {
    flightNumber: "DFA401",
    aircraft: "HondaJet Elite",
    capacity: 5,
    origin: "NZNE",
    destination: "NZCI",
    weekdays: [2, 5],
    localDeparture: "11:00",
    durationMinutes: 135,
    price: 620,
  },
  {
    flightNumber: "DFA402",
    aircraft: "HondaJet Elite",
    capacity: 5,
    origin: "NZCI",
    destination: "NZNE",
    weekdays: [3, 6],
    localDeparture: "13:15",
    durationMinutes: 150,
    price: 620,
  },
  {
    flightNumber: "DFA501",
    aircraft: "HondaJet Elite",
    capacity: 5,
    origin: "NZNE",
    destination: "NZTL",
    weekdays: [1],
    localDeparture: "12:30",
    durationMinutes: 95,
    price: 410,
  },
  {
    flightNumber: "DFA502",
    aircraft: "HondaJet Elite",
    capacity: 5,
    origin: "NZTL",
    destination: "NZNE",
    weekdays: [2],
    localDeparture: "10:30",
    durationMinutes: 110,
    price: 410,
  },
];

const dayMs = 24 * 60 * 60 * 1000;

export function formatAirport(code: AirportCode) {
  const airport = airports[code];
  return `${airport.city} (${code})`;
}

export function formatLocalDateTime(value: string | Date, airportCode: AirportCode) {
  return new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: airports[airportCode].timeZone,
  }).format(new Date(value));
}

export function makeBookingReference() {
  return `DFA-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

export function getSearchWindow(date1?: string | null, date2?: string | null) {
  const now = new Date();
  const start = date1 ? parseDateOnly(date1) : startOfUtcDay(now);
  const end = date2 ? parseDateOnly(date2) : new Date(start.getTime() + 28 * dayMs);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

export async function ensureSchedules(db: Db, start: Date, end: Date) {
  const schedules = db.collection<Schedule>("schedules");
  await schedules.createIndex(
    { flightKey: 1 },
    {
      unique: true,
      partialFilterExpression: { flightKey: { $type: "string" } },
    },
  );
  await schedules.createIndex({ departureTime: 1, origin: 1, destination: 1 });
  await schedules.createIndex({ "bookings.reference": 1 });
  await schedules.createIndex({ "bookings.passengerEmail": 1 });

  const docs = generateSchedules(start, end);
  if (docs.length === 0) {
    return;
  }

  await schedules.bulkWrite(
    docs.map((doc) => ({
      updateOne: {
        filter: { flightKey: doc.flightKey },
        update: { $setOnInsert: doc },
        upsert: true,
      },
    })),
    { ordered: false },
  );
}

export function generateSchedules(start: Date, end: Date): Schedule[] {
  const docs: Schedule[] = [];
  for (let cursor = startOfUtcDay(start); cursor <= end; cursor = new Date(cursor.getTime() + dayMs)) {
    for (const rule of rules) {
      if (!rule.weekdays.includes(cursor.getUTCDay())) {
        continue;
      }

      const departureTime = zonedTimeToUtc(cursor, rule.localDeparture, airports[rule.origin].timeZone);
      const arrivalTime = new Date(departureTime.getTime() + rule.durationMinutes * 60 * 1000);
      if (departureTime < start || departureTime > end) {
        continue;
      }

      const datePart = cursor.toISOString().slice(0, 10).replaceAll("-", "");
      docs.push({
        flightKey: `${rule.flightNumber}-${datePart}`,
        flightNumber: rule.flightNumber,
        aircraft: rule.aircraft,
        capacity: rule.capacity,
        origin: rule.origin,
        destination: rule.destination,
        departureTime: departureTime.toISOString(),
        arrivalTime: arrivalTime.toISOString(),
        price: rule.price,
        bookings: [],
      });
    }
  }
  return docs;
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function zonedTimeToUtc(date: Date, time: string, timeZone: string) {
  const [hour, minute] = time.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour, minute));
  const offset = getTimeZoneOffset(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offset);
}

function getTimeZoneOffset(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-NZ", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return asUtc - date.getTime();
}
