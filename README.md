# Yappie

Yappie is a production-oriented anonymous social platform for college students. Students create an anonymous identity with only age, gender, and college name, then use random chat, campus-only chat, and anonymous friend conversations.

## Features

- Anonymous account creation with generated usernames like `SilentTiger482`
- Random stranger matching across all online users
- Campus matching that only pairs students from the same college
- Real-time Socket.IO chat with typing indicators and next-stranger flow
- Anonymous friend requests, accepted friends list, and persistent friend chat
- Text-only safety boundary: no image, video, voice, or file upload UI or socket events
- Profanity/contact filtering, rate limiting, duplicate spam prevention, reports, and blocking
- Admin dashboard for total users, online users, active chats, and reports

## Tech Stack

- Next.js 15, React, TypeScript, Tailwind CSS
- Node.js custom server with Socket.IO
- MongoDB with Mongoose

## Folder Structure

```text
server/index.ts                  Socket.IO + custom Next server
src/app                          Next.js App Router pages and API routes
src/app/api/auth/anonymous       Anonymous account creation
src/app/api/friends              Friend request/list/remove APIs
src/app/api/messages/friend      Friend chat history API
src/app/api/reports              Safety report API
src/app/api/blocks               Block user API
src/app/api/admin/stats          Admin metrics API
src/components                   Mobile-first UI screens and app shell
src/hooks                        Client session hook
src/lib                          MongoDB, auth, safety, socket, helpers
src/models                       User, Friendship, Message, Report, Block schemas
```

## Database Models

### Users

- `anonymousUsername`
- `age`
- `gender`
- `college`
- `normalizedCollege`
- `sessionTokenHash`
- `blockedUsers`
- `isOnline`
- `lastSeenAt`
- `createdAt`

### Friends

- `userId`
- `friendId`
- `requestedBy`
- `pairKey`
- `status`

### Messages

- `senderId`
- `receiverId`
- `roomId`
- `chatType`
- `message`
- `timestamp`

### Reports

- `reporterId`
- `reportedUserId`
- `reason`
- `details`
- `createdAt`

### Blocks

- `blockerId`
- `blockedUserId`
- `pairKey`
- `createdAt`

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Start MongoDB locally or set `MONGODB_URI` to a hosted MongoDB Atlas connection string.

4. Run Yappie:

```bash
npm run dev
```

5. Open:

```text
http://localhost:3000
```

## Environment Variables

```text
MONGODB_URI=mongodb://127.0.0.1:27017/yappie
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_API_KEY=replace-with-a-long-random-secret
PORT=3000
```

If `ADMIN_API_KEY` is set, `/admin` must send the matching key to read dashboard stats.

## Production Deployment

Yappie uses a custom Node server for Socket.IO, so deploy it to a Node runtime that supports long-running WebSocket connections.

Good fits:

- Render Web Service
- Railway
- Fly.io
- DigitalOcean App Platform
- AWS ECS or EC2

Build command:

```bash
npm install && npm run build
```

Start command:

```bash
npm run start
```

Production checklist:

- Set `MONGODB_URI` to MongoDB Atlas or a managed MongoDB instance
- Set `NEXT_PUBLIC_APP_URL` to the deployed HTTPS origin
- Set a long random `ADMIN_API_KEY`
- Enable sticky sessions if the host load-balances WebSockets
- Add server-side moderation workflows for reviewing reports at scale
- Add HTTPS-only cookies if replacing localStorage session storage

## Safety Notes

Yappie intentionally never asks for real name, phone number, Instagram, images, voice notes, video, or files. The current safety layer filters profanity and contact-sharing patterns, rate-limits messages, blocks repeated spam, and supports reports and blocking.
