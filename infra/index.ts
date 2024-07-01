import { Namespace } from "@pulumi/kubernetes/core/v1";
import ArgoWorkflows from "./resources/argo-workflows";
import path from "node:path";

const namespace = new Namespace("scanweb-namespace", {
  metadata: {
    name: "argo",
  },
});

new ArgoWorkflows("argo", {
  namespace,
  workflows: [path.join(__dirname, "workflows", "scan-cc-template.yaml")],
});
