import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cache = globalForMongoose.mongooseCache ?? { conn: null, promise: null };
globalForMongoose.mongooseCache = cache;

export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;

  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    const atlasUri = "mongodb+srv://hiteshkasalya:QHIq0YhWQ3CCEqnk@cluster0.n1ranym.mongodb.net/?appName=Cluster0";
    const localUri = "mongodb://127.0.0.1:27017/yappie";
    const primaryUri = uri || atlasUri;

    console.log(`[Database] Attempting connection to primary MongoDB URI...`);

    cache.promise = mongoose.connect(primaryUri, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 4000 // 4 seconds timeout
    }).catch(async (err) => {
      console.warn(`[Database] ⚠️ Primary database connection failed: ${err.message || err}`);
      if (primaryUri !== atlasUri) {
        console.log(`[Database] 🔄 Falling back to known Atlas MongoDB...`);
        return mongoose.connect(atlasUri, {
          bufferCommands: false,
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 4000
        }).catch(async (err2) => {
          console.warn(`[Database] ⚠️ Atlas fallback connection failed: ${err2.message || err2}`);
          console.log(`[Database] 🔄 Falling back to local MongoDB: ${localUri}`);
          return mongoose.connect(localUri, {
            bufferCommands: false,
            maxPoolSize: 10
          });
        });
      } else {
        console.log(`[Database] 🔄 Falling back to local MongoDB: ${localUri}`);
        return mongoose.connect(localUri, {
          bufferCommands: false,
          maxPoolSize: 10
        });
      }
    });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
