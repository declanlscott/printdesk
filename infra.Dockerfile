ARG NODE_VERSION=22

# Base stage
FROM public.ecr.aws/lambda/nodejs:${NODE_VERSION} AS base

# Builder stage
FROM base AS builder
WORKDIR /usr/app

# Install pnpm
RUN npm install -g pnpm

# Copy source code, install dependencies, and build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter functions run infra:build

# Pulumi stage
FROM base AS pulumi

# Install pulumi
RUN dnf install -y tar gzip
RUN curl -fsSL https://get.pulumi.com | sh
RUN mv /root/.pulumi /opt/pulumi

# Final stage
FROM base AS final

# Copy pulumi binary
COPY --from=pulumi /opt/pulumi /opt/pulumi
ENV PATH="/opt/pulumi/bin:${PATH}"

# Create a pulumi home directory
RUN mkdir /tmp/pulumi_home
ENV PULUMI_HOME=/tmp/pulumi_home

# Set up Lambda function
WORKDIR ${LAMBDA_TASK_ROOT}
COPY --from=builder /usr/app/packages/functions/node/dist/infra/* ./

CMD [ "index.handler" ]
