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
