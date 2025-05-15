ARG PYTHON_VERSION=3.12
ARG PULUMI_VERSION=3.169.0

FROM public.ecr.aws/lambda/python:${PYTHON_VERSION}

# Install system dependencies
RUN dnf update -y && \
    dnf install -y git gcc tar gzip && \
    dnf clean all

# Install uv to manage the python runtime
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Install python dependencies
COPY requirements.txt ${LAMBDA_TASK_ROOT}/requirements.txt
RUN uv pip install -r requirements.txt --target ${LAMBDA_TASK_ROOT} --system

# Install and setup pulumi
RUN curl -fsSL https://get.pulumi.com | sh -s -- --version ${PULUMI_VERSION}
RUN mv /root/.pulumi /opt/pulumi
ENV PATH="/opt/pulumi/bin:${PATH}"
RUN mkdir /tmp/pulumi_home
ENV PULUMI_HOME=/tmp/pulumi_home

# Copy function code
COPY . ${LAMBDA_TASK_ROOT}
