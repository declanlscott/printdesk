FROM golang:1.24.3-alpine as builder

WORKDIR /app

COPY ../../go.* ./
COPY ../../core/ ./core
COPY ./ ./papercut-secure-reverse-proxy

WORKDIR /app/papercut-secure-reverse-proxy

RUN go mod download

RUN CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o bin/main cmd/main/main.go

FROM alpine

ARG SST_KEY_FILE=resource.enc

COPY --from=builder /app/papercut-secure-reverse-proxy/bin/main /app/papercut-secure-reverse-proxy/${SST_KEY_FILE} ./
