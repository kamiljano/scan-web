import { Namespace } from '@pulumi/kubernetes/core/v1';
import ArgoWorkflows from './resources/argo-workflows';
import path from 'node:path';
import DigitalOceanContainerRegistry from './resources/digitalocean-container-registry';

const namespace = new Namespace('scanweb-namespace', {
  metadata: {
    name: 'argo',
  },
});

// new DockerRegistry('docker-registry', {
//   namespace,
// });

new DigitalOceanContainerRegistry('digitalocean-container-registry', {});

new ArgoWorkflows('argo', {
  namespace,
  workflows: [path.join(__dirname, 'workflows', 'scan-cc-template.yaml')],
});
