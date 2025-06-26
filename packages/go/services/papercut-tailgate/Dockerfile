FROM golang:1.24.4-alpine as builder

WORKDIR /app

COPY ../../go.* ./
COPY ../../core/ ./core
COPY ./ ./papercut-tailgate

WORKDIR /app/papercut-tailgate

RUN go mod download

RUN CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o bin/main cmd/main/main.go

FROM alpine

ARG SST_KEY_FILE=resource.enc

COPY --from=builder /app/papercut-tailgate/bin/main /app/papercut-tailgate/${SST_KEY_FILE} ./
