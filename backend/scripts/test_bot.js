import { io } from "socket.io-client";

const MODE = process.argv[2] === "campus" ? "campus" : "random";

const RESPONSES = [
  "This iOS iMessage screen looks so clean! The blue and gray bubble shapes are exactly like the real app. 📱",
  "Click the header bar at the top to open the iOS Action Sheet options! Try adding me as a friend.",
  "If you send me a friend request, I will automatically accept it in real-time. Hand-to-hand testing! 🤝",
  "The ergonomic skip button next to the input is so easy to tap. Try clicking Skip to start a new search.",
  "Sonder is feeling extremely premium. No visual bloat, pure monochromatic design.",
  "Let's chat more! I'm active on the local MongoDB backend.",
  "That's awesome! Did you notice the typing indicator on the left side of the input bar?",
  "Sonder's privacy features are great. Our real identities are 100% safe."
];

async function startBot() {
  const email = `bot_${Date.now()}@mitwpu.edu.in`;
  const password = "botpassword123";

  console.log(`[Bot] Registering bot user: ${email}...`);
  
  try {
    const regRes = await fetch("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        age: 21,
        gender: "prefer_not_to_say",
        college: "MIT-WPU"
      })
    });

    if (!regRes.ok) {
      const errData = await regRes.json();
      throw new Error(`Registration failed: ${JSON.stringify(errData)}`);
    }

    const { user, token } = await regRes.json();
    console.log(`[Bot] Registered successfully as: ${user.anonymousUsername}`);

    console.log(`[Bot] Connecting socket.io client to http://localhost:3000 (Mode: ${MODE})...`);
    const socket = io("http://localhost:3000", {
      path: "/socket.io",
      auth: {
        userId: user.id,
        token: token
      },
      transports: ["websocket", "polling"]
    });

    let currentRoomId = null;

    socket.on("connect", () => {
      console.log("[Bot] Connected! Entering queue...");
      socket.emit("match:start", { mode: MODE });
    });

    socket.on("match:waiting", (payload) => {
      console.log(`[Bot] Waiting. Status: "${payload.message}"`);
    });

    socket.on("match:found", (payload) => {
      currentRoomId = payload.roomId;
      console.log(`\n[Bot] 🎉 MATCHED with: ${payload.peer.anonymousUsername} (${payload.peer.age}y, ${payload.peer.college})`);
      
      // Greet the user
      setTimeout(() => {
        if (currentRoomId === payload.roomId) {
          socket.emit("chat:message", {
            roomId: currentRoomId,
            message: `Hey! I am a simulated user. Try sending me a message or adding me as a friend from the header card at the top! 🤖`
          });
        }
      }, 1500);

      // Trigger a bot-initiated friend request after 8 seconds to let user test "incoming banner" accepting
      setTimeout(async () => {
        if (currentRoomId === payload.roomId) {
          console.log("[Bot] Sending real-time friend request to peer...");
          try {
            const response = await fetch("http://localhost:3000/api/friends", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "x-user-id": user.id,
                "x-session-token": token
              },
              body: JSON.stringify({ friendId: payload.peer.id })
            });

            if (response.ok) {
              const data = await response.json();
              socket.emit("friend:request:send", { roomId: currentRoomId, friendshipId: data.friendshipId });
            }
          } catch (err) {
            console.error("[Bot] Failed to post friendship REST:", err);
          }
        }
      }, 8000);
    });

    // Handle friend request received (if the user clicks Add Friend on the bot)
    socket.on("friend:request:received", async (payload) => {
      console.log(`[Bot] Received friend request from peer: friendshipId = ${payload.friendshipId}. Auto-accepting...`);
      
      // Auto-accept by patching the friendship via REST
      try {
        const acceptRes = await fetch(`http://localhost:3000/api/friends/${payload.friendshipId}`, {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json",
            "x-user-id": user.id,
            "x-session-token": token
          },
          body: JSON.stringify({ action: "accept" })
        });
        
        if (acceptRes.ok) {
          socket.emit("friend:request:accept", { roomId: currentRoomId, friendshipId: payload.friendshipId });
        }
      } catch (err) {
        console.error("[Bot] Failed to patch friendship:", err);
      }
    });

    socket.on("friend:request:accepted", (payload) => {
      console.log(`[Bot] 🤝 Friendship confirmed! We are now friends in the database.`);
      socket.emit("chat:message", {
        roomId: currentRoomId,
        message: "Yay! We are now anonymous friends! Check your 'Friends' page to see me listed there. 🤝"
      });
    });

    socket.on("chat:message", (incoming) => {
      if (incoming.senderId === user.id) return;

      console.log(`[Bot] Peer: "${incoming.message}"`);

      socket.emit("chat:typing", { roomId: currentRoomId, isTyping: true });

      setTimeout(() => {
        socket.emit("chat:typing", { roomId: currentRoomId, isTyping: false });

        if (currentRoomId === incoming.roomId) {
          const reply = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
          console.log(`[Bot] Reply: "${reply}"`);
          socket.emit("chat:message", {
            roomId: currentRoomId,
            message: reply
          });
        }
      }, 1500);
    });

    socket.on("match:ended", () => {
      console.log("[Bot] Peer skipped. Searching again...");
      currentRoomId = null;
      setTimeout(() => {
        socket.emit("match:start", { mode: MODE });
      }, 1500);
    });

    socket.on("disconnect", () => {
      console.log("[Bot] Disconnected.");
    });

  } catch (err) {
    console.error("[Bot] Error:", err);
  }
}

startBot();
