# Infra

## Services

* Harbor - Container registry. Argo Workflows depends on pre-built and published images, so this is where they're gonna be stored
* Argo Workflows - actually runs your workflow

## Prerequisites

Install the following tools:

```bash
brew install minikube
brew install kubernetes-cli
brew install pulumi/tap/pulumi
```

## Developing with minikube

1. Start your docker daemon.
2. Start minikube:

```bash
minikube start
```

3. Change the kubectl context to minikube

```bash
kubectl config use-context minikube
```

4. Deploy the application to minikube

```bash
pulumi up
```

5. Forward the ports from minikube to local

```bash
kubectl -n argo port-forward deployment/argo-server 2746:2746
```

6. Open the Argo UI in your browser on [https://localhost:2746](https://localhost:2746)

## Submitting a workflow template

```shell
argo template -n argo create ./infra/workflows/scan-cc-template.yaml
```

Or to update it

```shell
(argo template delete scan-cc -n argo || true) && argo template -n argo create ./infra/workflows/scan-cc-template.yaml
```
