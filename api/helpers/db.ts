/**
 * @file This file contains helper functions for connecting to a MongoDB database.
 */
import { Db } from "mongodb";

// Create cached connection variable.
let cachedDb = null;

/**
 * Retrieves the MongoDB URI based on the current environment.
 *
 * In a development environment, it returns the local MongoDB URI.
 * In other environments, it should return the respective MongoDB URI.
 *
 * @returns The MongoDB URI.
 */
export const getMongoDBURI = (): string => {
  let uri;
  if (process.env.NODE_ENV === "development") {
    uri = `mongodb://localhost:27017`;
  } else {
    uri = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}?retryWrites=true&w=majority`;
  }

  return uri;
};

/**
 * Establishes a connection to a MongoDB database.
 *
 * @param uri - The connection string for the MongoDB database.
 * @returns Returns a promise that resolves to the connected MongoClient.
 */
export async function connectToDatabase(uri: string): Promise<Db> {
  // If the database connection is cached, use it instead of creating a new connection.
  if (cachedDb) {
    return cachedDb;
  }

  const MongoClient = require("mongodb").MongoClient;
  const client = await MongoClient.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const db = client.db("payoutBot");

  // Cache the database connection and return the connection
  cachedDb = db;
  return db;
}
