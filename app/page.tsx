"use client";

import { FormEvent, useMemo, useState } from "react";

type AirportCode = "NZNE" | "YSSY" | "NZRO" | "NZGB" | "NZCI" | "NZTL";

type Schedule = {
  id: string;
  flightKey: string;
  flightNumber: string;
  aircraft: string;
  capacity: number;
  origin: AirportCode;
  destination: AirportCode;
  departureTime: string;
  arrivalTime: string;
  price: number;
  seatsBooked: number;
  seatsAvailable: number;
};

type Invoice = {
  booking: {
    reference: string;
    passengerTitle: string;
    passengerFirstName: string;
    passengerLastName: string;
    passengerEmail: string;
    bookedAt: string;
  };
  schedule: Pick<
    Schedule,
    "id" | "flightNumber" | "aircraft" | "origin" | "destination" | "departureTime" | "arrivalTime" | "price"
  >;
};

type BookingResult = Invoice["booking"] & {
  schedule: Invoice["schedule"];
};

const airports: Record<AirportCode, { city: string; name: string; timeZone: string }> = {
  NZNE: { city: "Dairy Flat", name: "Dairy Flat Airport", timeZone: "Pacific/Auckland" },
  YSSY: { city: "Sydney", name: "Sydney Airport", timeZone: "Australia/Sydney" },
  NZRO: { city: "Rotorua", name: "Rotorua Airport", timeZone: "Pacific/Auckland" },
  NZGB: { city: "Great Barrier Island", name: "Claris Airport", timeZone: "Pacific/Auckland" },
  NZCI: { city: "Chatham Islands", name: "Tuuta Airport", timeZone: "Pacific/Chatham" },
  NZTL: { city: "Lake Tekapo", name: "Lake Tekapo Airport", timeZone: "Pacific/Auckland" },
};

const airportCodes = Object.keys(airports) as AirportCode[];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function airportLabel(code: AirportCode) {
  return `${airports[code].city} (${code})`;
}

function localTime(value: string, code: AirportCode) {
  return new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: airports[code].timeZone,
  }).format(new Date(value));
}

export default function Home() {
  const [orig, setOrig] = useState<AirportCode>("NZNE");
  const [dest, setDest] = useState<AirportCode>("YSSY");
  const [date1, setDate1] = useState(today());
  const [date2, setDate2] = useState(addDays(28));
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selected, setSelected] = useState<Schedule | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [bookingResults, setBookingResults] = useState<BookingResult[]>([]);
  const [lookup, setLookup] = useState("");
  const [status, setStatus] = useState("Search for a route to begin.");
  const [isBusy, setIsBusy] = useState(false);

  const routeOptions = useMemo(
    () => airportCodes.filter((code) => code !== orig),
    [orig],
  );

  async function searchFlights(event?: FormEvent) {
    event?.preventDefault();
    setIsBusy(true);
    setStatus("Searching scheduled flights...");
    setInvoice(null);

    try {
      const params = new URLSearchParams({ orig, dest, date1, date2 });
      const response = await fetch(`/api/schedules?${params}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Search failed.");
      }
      setSchedules(data.schedules);
      setStatus(data.schedules.length ? `${data.schedules.length} matching flights found.` : "No flights match that search.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Search failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function makeBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) {
      return;
    }

    const form = new FormData(event.currentTarget);
    setIsBusy(true);
    setStatus("Reserving seat...");

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId: selected.id,
          passengerTitle: form.get("title"),
          passengerFirstName: form.get("firstName"),
          passengerLastName: form.get("lastName"),
          passengerEmail: form.get("email"),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Booking failed.");
      }
      setInvoice(data);
      setSchedules((current) =>
        current.map((schedule) =>
          schedule.id === selected.id
            ? {
                ...schedule,
                seatsBooked: schedule.seatsBooked + 1,
                seatsAvailable: schedule.seatsAvailable - 1,
              }
            : schedule,
        ),
      );
      setSelected(null);
      setStatus(`Booking confirmed: ${data.booking.reference}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Booking failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function findBookings(event: FormEvent) {
    event.preventDefault();
    setIsBusy(true);
    setStatus("Looking up bookings...");

    try {
      const query = lookup.includes("@")
        ? new URLSearchParams({ email: lookup.trim() })
        : new URLSearchParams({ reference: lookup.trim() });
      const response = await fetch(`/api/bookings?${query}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Lookup failed.");
      }
      setBookingResults(data.bookings);
      setStatus(data.bookings.length ? `${data.bookings.length} booking(s) found.` : "No bookings found.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Lookup failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function cancelBooking(reference: string) {
    setIsBusy(true);
    setStatus(`Cancelling ${reference}...`);

    try {
      const response = await fetch(`/api/bookings?${new URLSearchParams({ reference })}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Cancellation failed.");
      }
      setBookingResults((current) => current.filter((booking) => booking.reference !== reference));
      setStatus(`Booking ${reference} cancelled.`);
      await searchFlights();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Cancellation failed.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f7f6] text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8 sm:px-8">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Dairy Flat Airline</p>
            <h1 className="max-w-3xl text-4xl font-bold tracking-normal text-slate-950 sm:text-5xl">
              Boutique jet bookings from Dairy Flat Airport
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600">
              Search real calendar dates, reserve a seat, view your invoice, and manage bookings without an account.
            </p>
          </div>

          <form onSubmit={searchFlights} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm md:grid-cols-6">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              From
              <select
                value={orig}
                onChange={(event) => {
                  const nextOrigin = event.target.value as AirportCode;
                  setOrig(nextOrigin);
                  if (nextOrigin === dest) {
                    setDest(airportCodes.find((code) => code !== nextOrigin) ?? "YSSY");
                  }
                }}
                className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-950"
              >
                {airportCodes.map((code) => (
                  <option key={code} value={code}>
                    {airportLabel(code)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              To
              <select value={dest} onChange={(event) => setDest(event.target.value as AirportCode)} className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-950">
                {routeOptions.map((code) => (
                  <option key={code} value={code}>
                    {airportLabel(code)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Earliest date
              <input type="date" value={date1} onChange={(event) => setDate1(event.target.value)} className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-950" />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Latest date
              <input type="date" value={date2} onChange={(event) => setDate2(event.target.value)} className="h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-950" />
            </label>

            <button disabled={isBusy} className="h-11 self-end rounded-md bg-teal-700 px-5 font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400 md:col-span-2">
              {isBusy ? "Working..." : "Search flights"}
            </button>
          </form>

          <p className="rounded-md bg-teal-50 px-4 py-3 text-sm font-medium text-teal-900">{status}</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-slate-950">Available flights</h2>
          {schedules.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-slate-600">
              Try a wider date range for infrequent routes such as Sydney, Chatham Islands, Great Barrier Island, or Lake Tekapo.
            </div>
          ) : (
            <div className="grid gap-4">
              {schedules.map((schedule) => (
                <article key={schedule.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-slate-900 px-2 py-1 text-sm font-bold text-white">{schedule.flightNumber}</span>
                        <span className="text-sm font-medium text-slate-500">{schedule.aircraft}</span>
                      </div>
                      <h3 className="mt-3 text-xl font-bold text-slate-950">
                        {airportLabel(schedule.origin)} to {airportLabel(schedule.destination)}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Depart {localTime(schedule.departureTime, schedule.origin)} · Arrive{" "}
                        {localTime(schedule.arrivalTime, schedule.destination)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 md:items-end">
                      <p className="text-2xl font-bold text-slate-950">NZ${schedule.price}</p>
                      <p className="text-sm text-slate-600">
                        {schedule.seatsAvailable} of {schedule.capacity} seats available
                      </p>
                      <button
                        onClick={() => setSelected(schedule)}
                        disabled={schedule.seatsAvailable < 1 || isBusy}
                        className="h-10 rounded-md bg-amber-600 px-4 font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        Select
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">Manage booking</h2>
            <form onSubmit={findBookings} className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Email or booking reference
                <input value={lookup} onChange={(event) => setLookup(event.target.value)} className="h-11 rounded-md border border-slate-300 px-3 text-slate-950" placeholder="name@example.com or DFA-..." />
              </label>
              <button disabled={isBusy || !lookup.trim()} className="h-11 rounded-md bg-slate-900 px-4 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400">
                Find bookings
              </button>
            </form>

            <div className="mt-4 flex flex-col gap-3">
              {bookingResults.map((booking) => (
                <div key={booking.reference} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="font-bold text-slate-950">{booking.reference}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {booking.schedule.flightNumber}: {airportLabel(booking.schedule.origin)} to{" "}
                    {airportLabel(booking.schedule.destination)}
                  </p>
                  <p className="text-sm text-slate-600">{localTime(booking.schedule.departureTime, booking.schedule.origin)}</p>
                  <button onClick={() => cancelBooking(booking.reference)} className="mt-3 h-9 rounded-md border border-rose-300 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50">
                    Cancel booking
                  </button>
                </div>
              ))}
            </div>
          </section>

          {invoice && (
            <section className="rounded-lg border border-teal-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">Invoice</h2>
              <dl className="mt-4 grid gap-3 text-sm">
                <div>
                  <dt className="font-semibold text-slate-500">Booking reference</dt>
                  <dd className="text-lg font-bold text-teal-800">{invoice.booking.reference}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Passenger</dt>
                  <dd>
                    {invoice.booking.passengerTitle} {invoice.booking.passengerFirstName}{" "}
                    {invoice.booking.passengerLastName}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Flight</dt>
                  <dd>
                    {invoice.schedule.flightNumber} · {invoice.schedule.aircraft}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Route</dt>
                  <dd>
                    {airportLabel(invoice.schedule.origin)} to {airportLabel(invoice.schedule.destination)}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Departure</dt>
                  <dd>{localTime(invoice.schedule.departureTime, invoice.schedule.origin)}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Arrival</dt>
                  <dd>{localTime(invoice.schedule.arrivalTime, invoice.schedule.destination)}</dd>
                </div>
                <div className="border-t border-slate-200 pt-3">
                  <dt className="font-semibold text-slate-500">Total</dt>
                  <dd className="text-2xl font-bold text-slate-950">NZ${invoice.schedule.price}</dd>
                </div>
              </dl>
            </section>
          )}
        </aside>
      </section>

      {selected && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-950/50 p-4">
          <form onSubmit={makeBooking} className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-950">Book {selected.flightNumber}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {airportLabel(selected.origin)} to {airportLabel(selected.destination)}
                </p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-md border border-slate-300 px-3 py-1 font-semibold text-slate-600">
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-[110px_1fr]">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Title
                <select name="title" className="h-11 rounded-md border border-slate-300 px-3">
                  <option>Mr</option>
                  <option>Mrs</option>
                  <option>Miss</option>
                  <option>Ms</option>
                  <option>Mx</option>
                  <option>Dr</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                First name
                <input name="firstName" required className="h-11 rounded-md border border-slate-300 px-3" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
                Last name
                <input name="lastName" required className="h-11 rounded-md border border-slate-300 px-3" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
                Email
                <input name="email" type="email" required className="h-11 rounded-md border border-slate-300 px-3" />
              </label>
            </div>

            <div className="mt-5 rounded-md bg-slate-50 p-4 text-sm text-slate-700">
              <p>Depart: {localTime(selected.departureTime, selected.origin)}</p>
              <p>Arrive: {localTime(selected.arrivalTime, selected.destination)}</p>
              <p className="mt-2 text-lg font-bold text-slate-950">Total: NZ${selected.price}</p>
            </div>

            <button disabled={isBusy} className="mt-5 h-11 w-full rounded-md bg-teal-700 px-4 font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              Confirm booking
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
