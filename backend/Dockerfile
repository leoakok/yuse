# syntax=docker/dockerfile:1

FROM golang:1.25-alpine AS builder

WORKDIR /src

RUN apk add --no-cache ca-certificates git

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /out/server ./cmd/server

FROM alpine:3.21

RUN apk add --no-cache ca-certificates wget \
  && adduser -D -u 10001 -g app app

COPY --from=builder /out/server /usr/local/bin/server

USER app:app

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=20s \
  CMD wget -q --spider http://localhost:8080/healthz || exit 1

ENTRYPOINT ["server"]
