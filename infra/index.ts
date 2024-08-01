import { Namespace } from '@pulumi/kubernetes/core/v1';
import ArgoWorkflows from './resources/argo-workflows';
import path from 'node:path';
import ScanWeb from './resources/scan-web';
import { Config } from '@pulumi/pulumi';

const config = new Config();

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
    containerRegistry: config.require('containerRegistry'),
    workflows: [
      path.join(__dirname, 'workflows', 'import-cc-template.yaml'),
      path.join(__dirname, 'workflows', 'scan-template.yaml'),
      path.join(__dirname, 'workflows', 'import-ips-template.yaml'),
    ],
  },
  {
    dependsOn: [scanweb],
  },
);
