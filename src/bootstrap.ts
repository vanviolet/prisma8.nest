import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { AppEnvironment } from "./config/env.schema";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { createValidationPipe } from "./common/pipes/validation.pipe";
import { AppModule } from "./app.module";

export async function bootstrapApplication(environment: AppEnvironment): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  app.enableCors({ origin: environment.CORS_ORIGINS });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle("NestJS Boilerplate API")
    .setDescription("Versioned API contract for the NestJS boilerplate")
    .setVersion("1.0.0")
    .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" })
    .build();
  const openApiDocument = SwaggerModule.createDocument(app, swaggerConfig, {
    operationIdFactory: (_controllerKey, methodKey) => methodKey,
  });
  SwaggerModule.setup("docs", app, openApiDocument);

  app.enableShutdownHooks();
  await app.listen(environment.PORT, "0.0.0.0");
  Logger.log(`HTTP server listening on port ${environment.PORT}`, "Bootstrap");
}
