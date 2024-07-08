import { Namespace } from '@pulumi/kubernetes/core/v1';
import ArgoWorkflows from './resources/argo-workflows';
import path from 'node:path';
import ScanWebDb from './resources/scan-web-db';

const argoNamespace = new Namespace('argo-namespace', {
  metadata: {
    name: 'argo',
  },
});

const scanwebNamespace = new Namespace('scanweb-namespace', {
  metadata: {
    name: 'scanweb',
  },
});

new ScanWebDb('scan-web-db', {
  namespace: scanwebNamespace,
});

new ArgoWorkflows('argo', {
  namespace: argoNamespace,
  workflows: [path.join(__dirname, 'workflows', 'scan-cc-template.yaml')],
});
