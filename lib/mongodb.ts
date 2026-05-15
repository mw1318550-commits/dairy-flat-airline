import { MongoClient } from "mongodb";

let clientPromise: Promise<MongoClient>;

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

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = connectToMongo();
  }

  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = connectToMongo();
}

export default clientPromise;
