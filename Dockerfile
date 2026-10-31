# Multi-stage Dockerfile for ParlaGuessr Go + PocketBase backend
FROM golang:1.24-alpine AS builder

WORKDIR /app
RUN apk add --no-cache git ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags='-s -w' -o /app/parlaguesser .

# Final minimal deployment image
FROM alpine:latest

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /app/parlaguesser /app/parlaguesser

# Default PocketBase port
EXPOSE 8090

# Persistent storage volume for SQLite WAL database
VOLUME ["/app/pb_data"]

ENTRYPOINT ["/app/parlaguesser"]
CMD ["serve", "--http=0.0.0.0:8090", "--dir=/app/pb_data"]
