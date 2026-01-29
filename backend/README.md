# CodeSurf Runtime Server

NestJS backend that provides the CopilotKit runtime layer for CodeSurf IDE.

## Architecture

```
Frontend (Tauri) → Runtime Server (NestJS:5000) → Agent Server (Python:8080)
                           ↓
                    Supabase Auth Verification
```

## Features

- ✅ **Supabase JWT Authentication** - Verifies user tokens from frontend
- ✅ **CopilotKit Runtime** - Manages agent communication
- ✅ **Security Guards** - Protects all endpoints with auth
- ✅ **Environment Validation** - Type-safe configuration
- ✅ **CORS Enabled** - Allows Tauri app requests

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_JWT_SECRET` - Supabase JWT secret (from project settings)
- `AGENT_URL` - Python agent server URL (http://localhost:8080)
- `AGENT_INTERNAL_KEY` - Shared secret between runtime and agent

### 3. Start Development Server

```bash
npm run start:dev
```

Server will run on **port 5000**.

## API Endpoints

### POST /copilotkit

Main CopilotKit endpoint. Requires `Authorization: Bearer <jwt>` header.

**Request:**
```json
{
  "message": "Create a login component",
  "threadId": "abc-123"
}
```

**Response:** Server-Sent Events (SSE) stream from agent.

## Project Structure

```
src/
├── copilotkit/           # CopilotKit integration
│   ├── copilotkit.controller.ts
│   ├── copilotkit.service.ts
│   ├── copilotkit.module.ts
│   └── dto/
│       └── copilotkit-request.dto.ts
├── common/
│   ├── guards/           # Authentication guards
│   │   └── supabase-auth.guard.ts
│   └── services/         # Shared services
│       └── supabase.service.ts
├── config/               # Environment configuration
│   └── env.validation.ts
├── app.module.ts
└── main.ts
```

## Security

1. **JWT Verification**: Every request validates the Supabase JWT token
2. **Internal Key**: Agent server requires `X-Internal-Key` header
3. **User Context**: User ID and email forwarded to agent
4. **CORS**: Configured for localhost (restrict in production)

## Development

```bash
# Development mode with hot reload
npm run start:dev

# Build for production
npm run build

# Run production build
npm run start:prod

# Run tests
npm run test
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Public anon key | `eyJhbG...` |
| `SUPABASE_JWT_SECRET` | JWT secret | `your-secret` |
| `AGENT_URL` | Agent server URL | `http://localhost:8080` |
| `AGENT_INTERNAL_KEY` | Shared secret | `random-secure-key` |

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure proper CORS origins
3. Use environment secrets management
4. Deploy agent on internal network
5. Enable HTTPS/TLS
6. Set up monitoring and logging
