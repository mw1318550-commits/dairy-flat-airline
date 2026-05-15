import { MongoClient } from "mongodb";

let clientPromise: Promise<MongoClient> | undefined;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function connectToMongo() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Please add MONGODB_URI to your environment variables.");
  }

  return new MongoClient(uri).connect();
}

export default function getClientPromise() {
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = connectToMongo();
    }

    return global._mongoClientPromise;
  }

  if (!clientPromise) {
    clientPromise = connectToMongo();
  }

  return clientPromise;
}
