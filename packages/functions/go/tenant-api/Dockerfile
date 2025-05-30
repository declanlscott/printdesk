FROM golang:1.24.2-alpine as builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -tags lambda.norpc -o bin/bootstrap cmd/function/main.go

FROM public.ecr.aws/lambda/provided:al2023
ARG SST_KEY_FILE=resource.enc
COPY --from=builder /app/bin/bootstrap /app/${SST_KEY_FILE} ${LAMBDA_TASK_ROOT}
