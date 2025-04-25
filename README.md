## NestJS with Better Auth Example

This project demonstrates how to integrate [Better Auth](https://www.google.com/search?q=https://better-auth.dev/) into a NestJS application, providing a streamlined and flexible authentication solution. Special thanks to [ThallesP](https://github.com/ThallesP) for their excellent work on Better Auth\!

**Project Information:**

  * **Framework:** NestJS v11
  * **HTTP Framework:** Express v5 (integrated within NestJS)
  * **Database Adapter:** MongoDB

**Prerequisites:**

Before you begin, ensure you have the following installed:

  * **Node.js:** (Make sure it meets the requirements of NestJS v11)
  * **npm:** (Usually installed with Node.js)
  * **MongoDB:** You need a running MongoDB instance.

**Project Setup:**

1.  **Clone the repository** (if you haven't already).

2.  **Install dependencies:**

    ```bash
    $ npm i
    ```

3.  **Create and configure the `.env` file:**

    Create a `.env` file in the root of your project and populate it with the following environment variables:

    ```sh
    MONGODB_URI="YOUR_MONGODB_CONNECTION_STRING"
    GITHUB_CLIENT_ID="YOUR_GITHUB_APPLICATION_CLIENT_ID"
    GITHUB_CLIENT_SECRET="YOUR_GITHUB_APPLICATION_CLIENT_SECRET"
    GOOGLE_CLIENT_ID="YOUR_GOOGLE_APPLICATION_CLIENT_ID"
    GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_APPLICATION_CLIENT_SECRET"
    TRUSTED_ORIGINS="http://localhost:3001" # URL of your frontend application
    ```

    **Important:** Replace the placeholder values with your actual MongoDB connection string and OAuth application credentials. The `TRUSTED_ORIGINS` should list the URLs from which your frontend application will be making requests.

**Running the Application:**

You can run the NestJS application in different modes:

  * **Development mode (with hot-reloading):**

    ```bash
    $ npm run start:dev
    ```

    This will automatically rebuild and restart the server whenever you make changes to the code.

  * **Production mode:**

    ```bash
    $ npm run start
    ```

    This command compiles the application and starts the server.

**Key Configuration Details:**

  * **Better Auth Instance:** The core configuration for Better Auth is located in `src/auth/auth.module.ts` around line 172. This is where you initialize Better Auth and register your desired authentication providers.

```typescript
 // src/auth/auth.module.ts
static forRoot(options: AuthModuleOptions = {}) {
  // ...
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
        clientId: process.env.GITHUB_CLIENT_ID as string,
        clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      },
    },
  });

  // ...
}
```

  As you can see, this example configures the following authentication providers:

    * **Google:** For Google OAuth-based login.
    * **Github:** For GitHub OAuth-based login.
    * **Credentials:** For traditional email/password login.

  You can easily add more providers as needed by importing them from `better-auth/providers/*` and including them in the `providers` array.

* **Auth Guard Usage:** Check the `app.controller.ts` file to see how to use the Better Auth guard to protect your routes.

```typescript
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard, UserSession } from './auth/auth.guard';
import { Optional, Public, Session } from './auth/decorators';
import { UserId } from './auth/user-id.decorator';

@Controller()
@UseGuards(AuthGuard)
export class AppController {
  constructor(private readonly appService: AppService) {}

  /* 
    Protected route that requires authentication
    The session and userId are automatically injected by the AuthGuard
  */
  @Get('/cats')
  getCats(
    @Session() session: UserSession,
    @UserId() userId: string,
    @Body() body: any,
  ): { message: string } {
    console.log({
      session,
      userId,
      body,
    });

    return { message: this.appService.getCat() };
  }

  /* 
   Public route that does not require authentication
  */
  @Post('/cats')
  @Public()
  sayHello(
    @Session() session: UserSession,
    @UserId() userId: string,
    @Body() body: any,
  ): { message: string } {
    console.log({
      session,
      userId,
      body,
    });

    return { message: this.appService.getCat() };
  }
}

```

The `@UseGuards(AuthGuard)` decorator ensures that only authenticated users can access the `/api/protected` route. The `@Session()` decorator allows you to access the user's session information.

* **Global API Prefix:** This project uses a global prefix of `api` for all routes. You can find this configuration in the `src/main.ts` file:

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  app.set('query parser', 'extended');

  const trustedOrigins = (process.env.TRUSTED_ORIGINS as string).split(',');

  app.enableCors({
    origin: trustedOrigins,
    credentials: true,
  });

  app.setGlobalPrefix('api', { exclude: ['/api/auth/{*path}'] });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```
**Frontend Integration (Next.js Example):**

When integrating with your frontend application (e.g., a Next.js project), you'll need to configure the Better Auth client. Here's an example of how to do this using `@better-auth/react`:

```typescript
// Your Next.js auth client setup (e.g., in a utils/auth.ts file)

import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields } from 'better-auth/client/plugins';

export const { signIn, signUp, signOut, useSession } = createAuthClient({
  baseURL: "http://localhost:3000", // Backend URL (NestJS)
  plugins: [
    inferAdditionalFields({
      user: {
        surname: {
          type: 'string',
        },
        role: {
          type: 'string',
          nullable: true,
        },
      },
    }),
  ],
});
```

**Important:**

  * Ensure that the `baseURL` in your frontend `createAuthClient` configuration points to your NestJS backend URL, including any global prefixes you have set (in this case, `/api`).
  * **Server Callback URLs:** You **must** add the appropriate callback URLs to your Better Auth client configurations in your frontend project. These URLs are where the user will be redirected after successful authentication with social providers (like Google and GitHub). You'll typically configure these in your OAuth application settings on the respective provider's developer portals.

**Sign-in with Callback URL Example:**

When performing actions like email/password sign-in or social login from your frontend, you can provide a `callbackURL` to specify where the user should be redirected after the authentication process. If you don't provide a `callbackURL`, the user will be redirected to the backend URL by default.

```typescript
// Example of email sign-in from your Next.js component

import { signIn } from '@/lib/auth-client'; // Assuming your auth client is in utils/auth.ts

async function handleSignIn(email: string, password: string, rememberMe: boolean) {
  const { error,data } = await signIn.email({
    email,
    password,
    rememberMe,
    callbackURL: "http://localhost:3001/dashboard", // Example frontend callback URL. Redirects to this URL after sign-in.
  });
}
```