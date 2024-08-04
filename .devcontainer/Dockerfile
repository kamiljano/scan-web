FROM mcr.microsoft.com/vscode/devcontainers/base:ubuntu-24.04

USER vscode
WORKDIR /home/vscode

RUN sudo apt update -y
RUN sudo apt-get update
RUN sudo apt install -y postgresql-common postgresql libpq-dev apt-transport-https ca-certificates curl gnupg
RUN sudo apt-get install -y gitleaks

# Install minikube
RUN curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-arm64
RUN sudo install minikube-linux-arm64 /usr/local/bin/minikube && rm minikube-linux-arm64

# Install pulumi
RUN curl -fsSL https://get.pulumi.com | sh
ENV PATH=$PATH:/home/vscode/.pulumi/bin

# Install kubectl
RUN curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.30/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
RUN sudo chmod 644 /etc/apt/keyrings/kubernetes-apt-keyring.gpg
RUN echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.30/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list
RUN sudo chmod 644 /etc/apt/sources.list.d/kubernetes.list
RUN sudo apt-get update -y
RUN sudo apt-get install -y kubectl

# Install NodeJS
RUN sudo apt update -y
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash && sudo apt install -y nodejs
RUN sudo npm install -g pnpm@9.1.1

# Install Argo
RUN curl -sLO https://github.com/argoproj/argo-workflows/releases/download/v3.5.8/argo-linux-amd64.gz
RUN gunzip argo-linux-amd64.gz
RUN chmod +x argo-linux-amd64
RUN sudo mv ./argo-linux-amd64 /usr/local/bin/argo

RUN git config --global --add safe.directory /workspaces/scan-web

# Install doctl
RUN wget https://github.com/digitalocean/doctl/releases/download/v1.104.0/doctl-1.104.0-linux-amd64.tar.gz
RUN tar xf ~/doctl-1.104.0-linux-amd64.tar.gz
RUN sudo mv ~/doctl /usr/local/bin

# Install bun
RUN curl -fsSL https://bun.sh/install | bash