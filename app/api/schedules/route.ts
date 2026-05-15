import clientPromise from "@/lib/mongodb";
import { AirportCode, ensureSchedules, getSearchWindow, Schedule } from "@/lib/flights";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orig = searchParams.get("orig") as AirportCode | null;
    const dest = searchParams.get("dest") as AirportCode | null;
    const { start, end } = getSearchWindow(searchParams.get("date1"), searchParams.get("date2"));

    const client = await clientPromise;
    const db = client.db();
    await ensureSchedules(db, start, end);

    const filter: Record<string, unknown> = {
      departureTime: { $gte: start.toISOString(), $lte: end.toISOString() },
    };

    if (orig) {
      filter.origin = orig;
    }

    if (dest) {
      filter.destination = dest;
    }

    const schedules = await db
      .collection<Schedule>("schedules")
      .find(filter)
      .sort({ departureTime: 1 })
      .toArray();

    return Response.json({
      schedules: schedules.map(({ _id, ...schedule }) => ({
        id: _id.toString(),
        ...schedule,
        seatsBooked: schedule.bookings.length,
        seatsAvailable: schedule.capacity - schedule.bookings.length,
      })),
    });
  } catch (error) {
    console.error("Schedule search error:", error);
    return Response.json({ error: "Schedule search failed. Please check the server logs." }, { status: 500 });
  }
}
