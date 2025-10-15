import * as dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerModule,
} from '@nestjs/swagger';

import { INJECTION_TOKEN } from '@shared/constants';
import { HttpLoggingInterceptor } from '@shared/interceptors/http-logging.interceptor';
import { HttpResponseInterceptor } from '@shared/interceptors/http-response.interceptor';

import { AppModule } from './app.module';

dayjs.extend(utc);
dayjs.extend(timezone);

// set it once if you want all dayjs() calls to default to that zone
// dayjs.tz.setDefault('Asia/Ho_Chi_Minh');

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors();

  app.useBodyParser('json', { limit: '15mb' });
  app.useBodyParser('urlencoded', { limit: '15mb', extended: true });

  // Validate data of all HTTP requests.
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      forbidUnknownValues: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('/v1/api');

  if (process.env.ENABLE_CORS === 'true') {
    app.enableCors({
      origin: '*',
      methods: '*',
      credentials: true,
    });
  }

  // const auditService = app.get(INJECTION_TOKEN.AUDIT_SERVICE);

  // For uncaught exceptions.
  app.useGlobalInterceptors(
    new HttpLoggingInterceptor(),
    // new HttpResponseInterceptor(auditService), // Temporary comment because audit service not available
  );

  // Swagger config.
  const enableSwagger = process.env.ENABLE_SWAGGER === 'true';
  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('BOT Telegram APIs')
      .setDescription('All backend APIs for the product.')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', in: 'header' })
      .build();
    const document = SwaggerModule.createDocument(app, config);
    const customOptions: SwaggerCustomOptions = {
      swaggerOptions: {
        persistAuthorization: true,
      },
    };
    SwaggerModule.setup('docs', app, document, customOptions);
  }

  const port = process.env.PORT || '3000';
  const mainUrl = `http://localhost:${port}`;

  await app.listen(port);
  console.log(`Server is listening on ${mainUrl}`);

  if (enableSwagger) {
    console.log(`Swagger API documentation is running on ${mainUrl}/docs`);
  }
}
bootstrap();
