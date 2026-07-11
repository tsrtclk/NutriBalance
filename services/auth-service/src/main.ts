import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  app.use(helmet());
  app.enableCors({
    origin: config.get<string>("CORS_ORIGIN", "*").split(","),
    credentials: true,
  });
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  if (config.get<string>("NODE_ENV") !== "production") {
    const swagger = new DocumentBuilder()
      .setTitle("NutriBalance — Auth Service")
      .setVersion("0.1.0")
      .addBearerAuth()
      .build();
    SwaggerModule.setup(
      "docs",
      app,
      SwaggerModule.createDocument(app, swagger),
    );
  }
  app.enableShutdownHooks();
  const port = config.get<number>("PORT", 3002);
  await app.listen(port);
  console.log(`✓ auth-service listening on :${port}`);
}
bootstrap().catch((err) => {
  console.error("Failed to bootstrap auth-service:", err);
  process.exit(1);
});
