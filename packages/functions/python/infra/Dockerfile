ARG PYTHON_VERSION=3.13
ARG PULUMI_VERSION=3.156.0

FROM public.ecr.aws/lambda/python:${PYTHON_VERSION}

# Setup and install dependencies
COPY requirements.txt ${LAMBDA_TASK_ROOT}
RUN pip install -r requirements.txt

# Install pulumi
RUN dnf install -y tar gzip
RUN curl -fsSL https://get.pulumi.com | sh -s -- --version ${PULUMI_VERSION}
RUN mv /root/.pulumi /opt/pulumi

# Add to PATH
ENV PATH="/opt/pulumi/bin:${PATH}"

# Create a pulumi home directory
RUN mkdir /tmp/pulumi_home
ENV PULUMI_HOME=/tmp/pulumi_home

# Set up Lambda function
COPY . ${LAMBDA_TASK_ROOT}

CMD [ "main.handler" ]
