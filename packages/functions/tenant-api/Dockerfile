FROM golang:1.24.4-alpine as builder

WORKDIR /app

COPY ../../go.* ./
COPY ../../core/ ./core
COPY ./ ./tenant-api

WORKDIR /app/tenant-api

RUN go mod download

RUN CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -tags lambda.norpc -o bin/bootstrap cmd/main/main.go

FROM public.ecr.aws/lambda/provided:al2023

ARG SST_KEY_FILE=resource.enc

COPY --from=builder /app/tenant-api/bin/bootstrap /app/tenant-api/${SST_KEY_FILE} ${LAMBDA_TASK_ROOT}