# Stage 1: Build the Go binary
FROM golang:1.23.12-alpine3.21 AS builder

RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache git

WORKDIR /app

COPY . .

# Build the binary with optimizations
RUN go mod tidy && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o main ./cmd/api/main.go

# Stage 2: Final ultra-lightweight and secure image
FROM gcr.io/distroless/static-debian12

WORKDIR /

COPY --from=builder /app/main .

# Copy timezone data if needed (distroless static usually includes CA certs)
# COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

EXPOSE 8080

# Distroless images have a default non-root user (nonroot)
USER 65532:65532

ENTRYPOINT ["/main"]
