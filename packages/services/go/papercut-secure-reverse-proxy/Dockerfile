FROM golang:1.24.2-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o main cmd/main/main.go

FROM alpine
ARG CUSTOM_SST_KEY_FILE=resource.enc
WORKDIR /root/
COPY --from=builder /app/main /app/${CUSTOM_SST_KEY_FILE} ./
CMD ["./main"]
