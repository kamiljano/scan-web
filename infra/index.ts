import { Namespace } from '@pulumi/kubernetes/core/v1';
import ArgoWorkflows from './resources/argo-workflows';
import path from 'node:path';
import ScanWeb from './resources/scan-web';

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

const scanweb = new ScanWeb('scan-web-db', {
  namespace: scanwebNamespace,
});

new ArgoWorkflows(
  'argo',
  {
    namespace: argoNamespace,
    workflows: [
      path.join(__dirname, 'workflows', 'import-cc-template.yaml'),
      path.join(__dirname, 'workflows', 'scan-template.yaml'),
    ],
  },
  {
    dependsOn: [scanweb],
  },
);
