FROM golang:1.25.5-alpine as builder

WORKDIR /app

COPY ../../../go.* ./
COPY ../../core/go.* ./core
COPY ../../core/pkg ./core
COPY ./ ./papercut-gateway

WORKDIR /app/papercut-gateway

RUN go mod download

RUN CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o bin/main cmd/main/main.go

FROM alpine

ARG SST_KEY_FILE=resource.enc

COPY --from=builder /app/papercut-gateway/bin/main /app/papercut-gateway/${SST_KEY_FILE} ./