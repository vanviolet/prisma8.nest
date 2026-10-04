import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { AppEnvironment } from "./config/schema.env";
import { HttpExceptionFilter } from "./common/filters/filter.http.exception";
import { LoggingInterceptor } from "./common/interceptors/interceptor.logging";
import { ResponseInterceptor } from "./common/interceptors/interceptor.response";
import { create_validation_pipe } from "./common/pipes/pipe.validation";
import { AppModule } from "./module.app";

export async function bootstrap_application(environment: AppEnvironment): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  app.enableCors({ origin: environment.cors_origins });
  app.useGlobalPipes(create_validation_pipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseInterceptor());

  const swagger_config = new DocumentBuilder()
    .setTitle("NestJS Boilerplate API")
    .setDescription("Versioned API contract for the NestJS boilerplate")
    .setVersion("1.0.0")
    .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" })
    .build();
  const open_api_document = SwaggerModule.createDocument(app, swagger_config, {
    operationIdFactory: (_controller_key, method_key) => method_key,
  });
  SwaggerModule.setup("docs", app, open_api_document);

  app.enableShutdownHooks();
  await app.listen(environment.PORT, "0.0.0.0");
  Logger.log(`HTTP server listening on port ${environment.PORT}`, "Bootstrap");
}
