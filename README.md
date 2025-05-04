# NestJS with Better Auth Example

This project demonstrates how to integrate [Better Auth](https://better-auth.dev/) into a NestJS application for streamlined and flexible authentication.

**Special thanks to [ThallesP](https://github.com/ThallesP) for their work on Better Auth!**

---

## 🧰 Project Information

- **Framework:** NestJS v11  
- **HTTP Framework:** Express v5 (integrated in NestJS)  
- **Database Adapter:** MongoDB  

---

## ✅ Prerequisites

Ensure the following are installed:

- **Node.js** (compatible with NestJS v11)
- **npm** (comes with Node.js)
- **MongoDB** (running instance required)

---

## ⚙️ Project Setup

1. **Clone the repository**

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Create and configure the `.env` file**

   Create a `.env` file in the project root with:

   ```env
   MONGODB_URI="YOUR_MONGODB_CONNECTION_STRING"
   GITHUB_CLIENT_ID="YOUR_GITHUB_APPLICATION_CLIENT_ID"
   GITHUB_CLIENT_SECRET="YOUR_GITHUB_APPLICATION_CLIENT_SECRET"
   GOOGLE_CLIENT_ID="YOUR_GOOGLE_APPLICATION_CLIENT_ID"
   GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_APPLICATION_CLIENT_SECRET"
   TRUSTED_ORIGINS="http://localhost:3001"
   ```

   > Replace placeholders with your actual credentials and frontend origin.

---

## 🚀 Running the Application

- **Development Mode**

  ```bash
  npm run start:dev
  ```

- **Production Mode**

  ```bash
  npm run start
  ```

---

## 🔐 Authentication Configuration

The core Better Auth config is in `src/auth/auth.module.ts`:

```ts
static forRoot(options: AuthModuleOptions = {}) {
  const auth = betterAuth({
    trustedOrigins,
    database: mongodbAdapter(db),
    emailAndPassword: {
      enabled: true,
    },
    session: {
      freshAge: 10,
      modelName: 'sessions',
    },
    user: {
      modelName: 'users',
      additionalFields: {
        role: {
          type: 'string',
          defaultValue: 'user',
        },
      },
    },
    account: {
      modelName: 'accounts',
    },
    verification: {
      modelName: 'verifications',
    },
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    },
  });

  // ...
}
```

**Supported Providers:**

- Google
- GitHub
- Email/Password

Add more providers via `better-auth/providers/*`.

---

## 🛡️ Protecting Routes

See `app.controller.ts` for usage of the `AuthGuard`:

```ts
@Controller()
@UseGuards(AuthGuard)
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/cats')
  getCats(@Session() session: UserSession, @UserId() userId: string, @Body() body: any) {
    console.log({ session, userId, body });
    return { message: this.appService.getCat() };
  }

  @Post('/cats')
  @Public()
  sayHello(@Session() session: UserSession, @UserId() userId: string, @Body() body: any) {
    console.log({ session, userId, body });
    return { message: this.appService.getCat() };
  }
}
```

---

## 🌐 Global API Prefix

Set in `src/main.ts`:

```ts
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  const trustedOrigins = process.env.TRUSTED_ORIGINS?.split(',') || [];

  app.enableCors({
    origin: trustedOrigins,
    credentials: true,
  });

  app.setGlobalPrefix('api', { exclude: ['/api/auth/{*path}'] });

  await app.listen(process.env.PORT ?? 3000);
}
```

---

## 🧩 Frontend Integration (Next.js)

Use `@better-auth/react` to connect your frontend:

```ts
import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields } from 'better-auth/client/plugins';

export const { signIn, signUp, signOut, useSession } = createAuthClient({
  baseURL: "http://localhost:3000",
  plugins: [
    inferAdditionalFields({
      user: {
        surname: { type: 'string' },
        role: { type: 'string', nullable: true },
      },
    }),
  ],
});
```

> Do **not** include `/api` in the baseURL.

---

## 🔁 Redirect After Sign-in

```ts
const { error, data } = await signIn.email({
  email,
  password,
  rememberMe,
  callbackURL: "http://localhost:3001/dashboard",
});
```

---

## 🔒 Session Handling in Next.js

### Middleware (`middleware.ts`)

**Option 1: Check cookies**

```ts
import { getSessionCookie } from 'better-auth/cookies';

export async function middleware(request: NextRequest) {
  const cookies = getSessionCookie(request);
  if (!cookies) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }
  return NextResponse.next();
}
```

**Option 2: Check session with API**

```ts
export async function middleware(request: NextRequest) {
  const res = await fetch("http://localhost:3000/api/auth/get-session", {
    headers: {
      cookie: request.headers.get('cookie') || '',
    },
  });

  const session = await res.json();
  if (!session) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  return NextResponse.next();
}
```

---

### Server-side Rendering (`page.tsx`)

**Require Session**

```ts
export default async function Page() {
  const cookie = headers().get('cookie');

  const res = await fetch("http://localhost:3000/api/auth/get-session", {
    headers: { cookie: cookie || '' },
  });

  const session = await res.json();
  if (!session) {
    return redirect('/sign-in');
  }

  return (
    <div>
      <h1>Protected Page</h1>
    </div>
  );
}
```

**Fetch Data with Session**

```ts
export default async function Page() {
  const res = await fetch("http://localhost:3000/api/auth/foo", {
    headers: await headers(),
    cache: 'no-store',
  });

  const data = await res.json();

  return (
    <div>
      <h1>Protected Page</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
```

---

### Client Component Example

```ts
'use client';

import { useSession } from '@/lib/auth-client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Page() {
  const { data: session } = useSession();
  const [data, setData] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (!session) {
      router.push('/sign-in');
    }
  }, [session, router]);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch('http://localhost:3000/api/auth/foo', {
        credentials: 'include',
      });
      const result = await res.json();
      setData(result);
    }

    if (session) {
      fetchData();
    }
  }, [session]);

  return (
    <div>
      <h1>Protected Page</h1>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
```

---

## 🧪 Tips

- Use `.env` variables for all sensitive data.
- Ensure CORS is properly configured.
- Add the correct callback URLs in your OAuth provider settings.
- Don’t forget to include credentials when making authenticated fetch requests.
