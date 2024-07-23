import { Namespace } from '@pulumi/kubernetes/core/v1';
import ArgoWorkflows from './resources/argo-workflows';
import path from 'node:path';
import ScanWeb from './resources/scan-web';
import * as pulumi from '@pulumi/pulumi';
import Jumpbox from './resources/jumpbox';

const config = new pulumi.Config();
const isMinikube = config.requireBoolean('isMinikube');

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

if (isMinikube) {
  new Jumpbox('jumpbox', {
    namespace: argoNamespace,
  });
}

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
