import { io } from "socket.io-client";

// Connect to local server
const connectAndJoin = async (id, token) => {
  const socket = io("http://localhost:3000", {
    path: "/socket.io",
    auth: { userId: id, token },
  });

  return new Promise((resolve) => {
    socket.on("connect", () => {
      console.log(`[${id}] Connected`);
      resolve(socket);
    });
    socket.on("connect_error", (err) => {
      console.error(`[${id}] Error:`, err.message);
    });
    socket.on("match:waiting", (data) => console.log(`[${id}] Waiting:`, data));
    socket.on("match:found", (data) => console.log(`[${id}] Match Found! Room:`, data.roomId));
    socket.on("match:error", (data) => console.log(`[${id}] Match Error:`, data));
  });
};

async function run() {
  console.log("Connecting user 1...");
  const s1 = await connectAndJoin("user1", "token1");
  console.log("Connecting user 2...");
  const s2 = await connectAndJoin("user2", "token2");

  console.log("User 1 emitting match:start");
  s1.emit("match:start", { mode: "random" });

  setTimeout(() => {
    console.log("User 2 emitting match:start");
    s2.emit("match:start", { mode: "random" });
  }, 500);

  setTimeout(() => {
    console.log("Test finished.");
    process.exit(0);
  }, 2000);
}

run();
