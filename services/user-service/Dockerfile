# Stage 1: Build
FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
# Run as non-root user for production security
RUN addgroup -S shopnow && adduser -S shopnow -G shopnow
USER shopnow
COPY --from=builder /app/target/user-service-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8081
ENV PORT=8081
ENTRYPOINT ["java", "-jar", "app.jar"]
