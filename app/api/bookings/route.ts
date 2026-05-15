import { ObjectId } from "mongodb";
import getClientPromise from "@/lib/mongodb";
import { Booking, ensureSchedules, getSearchWindow, makeBookingReference, Schedule } from "@/lib/flights";

type BookingRequest = {
  scheduleId?: string;
  passengerTitle?: string;
  passengerFirstName?: string;
  passengerLastName?: string;
  passengerEmail?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase();
  const reference = searchParams.get("reference")?.trim().toUpperCase();

  if (!email && !reference) {
    return Response.json({ error: "Provide an email address or booking reference." }, { status: 400 });
  }

  const client = await getClientPromise();
  const db = client.db();
  const { start, end } = getSearchWindow();
  await ensureSchedules(db, start, end);

  const filter = reference
    ? { "bookings.reference": reference }
    : { "bookings.passengerEmail": email };

  const schedules = await db
    .collection<Schedule>("schedules")
    .find(filter)
    .sort({ departureTime: 1 })
    .toArray();

  const bookings = schedules.flatMap((schedule) =>
    schedule.bookings
      .filter((booking) => booking.reference === reference || booking.passengerEmail === email)
      .map((booking) => ({
        ...booking,
        schedule: {
          id: schedule._id.toString(),
          flightNumber: schedule.flightNumber,
          aircraft: schedule.aircraft,
          origin: schedule.origin,
          destination: schedule.destination,
          departureTime: schedule.departureTime,
          arrivalTime: schedule.arrivalTime,
          price: schedule.price,
        },
      })),
  );

  return Response.json({ bookings });
}

export async function POST(request: Request) {
  const body = (await request.json()) as BookingRequest;
  const scheduleId = body.scheduleId;
  const passengerFirstName = body.passengerFirstName?.trim();
  const passengerLastName = body.passengerLastName?.trim();
  const passengerEmail = body.passengerEmail?.trim().toLowerCase();
  const passengerTitle = body.passengerTitle?.trim() || "Mx";

  if (!scheduleId || !ObjectId.isValid(scheduleId)) {
    return Response.json({ error: "Choose a valid scheduled flight." }, { status: 400 });
  }

  if (!passengerFirstName || !passengerLastName || !passengerEmail) {
    return Response.json({ error: "Passenger name and email are required." }, { status: 400 });
  }

  const client = await getClientPromise();
  const db = client.db();
  const schedules = db.collection<Schedule>("schedules");
  const _id = new ObjectId(scheduleId);
  const schedule = await schedules.findOne({ _id });

  if (!schedule) {
    return Response.json({ error: "Scheduled flight was not found." }, { status: 404 });
  }

  if (schedule.bookings.length >= schedule.capacity) {
    return Response.json({ error: "This flight is already full." }, { status: 409 });
  }

  const duplicate = schedule.bookings.some((booking) => booking.passengerEmail === passengerEmail);
  if (duplicate) {
    return Response.json({ error: "This passenger is already booked on this flight." }, { status: 409 });
  }

  const booking: Booking = {
    reference: makeBookingReference(),
    passengerTitle,
    passengerFirstName,
    passengerLastName,
    passengerEmail,
    bookedAt: new Date().toISOString(),
  };

  const result = await schedules.updateOne(
    {
      _id,
      $expr: { $lt: [{ $size: "$bookings" }, "$capacity"] },
      "bookings.passengerEmail": { $ne: passengerEmail },
    },
    { $push: { bookings: booking } },
  );

  if (result.modifiedCount !== 1) {
    return Response.json({ error: "The seat could not be reserved. Please try another flight." }, { status: 409 });
  }

  return Response.json({
    booking,
    schedule: {
      id: scheduleId,
      flightNumber: schedule.flightNumber,
      aircraft: schedule.aircraft,
      origin: schedule.origin,
      destination: schedule.destination,
      departureTime: schedule.departureTime,
      arrivalTime: schedule.arrivalTime,
      price: schedule.price,
    },
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get("reference")?.trim().toUpperCase();

  if (!reference) {
    return Response.json({ error: "A booking reference is required." }, { status: 400 });
  }

  const client = await getClientPromise();
  const db = client.db();
  const result = await db
    .collection<Schedule>("schedules")
    .updateOne({ "bookings.reference": reference }, { $pull: { bookings: { reference } } });

  if (result.modifiedCount !== 1) {
    return Response.json({ error: "Booking reference was not found." }, { status: 404 });
  }

  return Response.json({ cancelled: true, reference });
}
