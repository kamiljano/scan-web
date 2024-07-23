import { ComponentResource, ComponentResourceOptions } from '@pulumi/pulumi';
import {
  Namespace,
  PersistentVolumeClaim,
  Service,
} from '@pulumi/kubernetes/core/v1';
import { Deployment } from '@pulumi/kubernetes/apps/v1';

interface DockerRegistryProps {
  namespace: Namespace;
}

export default class DockerRegistry extends ComponentResource {
  constructor(
    name: string,
    props: DockerRegistryProps,
    opts?: ComponentResourceOptions,
  ) {
    super('custom:resource:ScanWeb', name, {}, opts);

    const registryPVC = new PersistentVolumeClaim(
      'docker-registry-pvc',
      {
        metadata: {
          name: 'docker-registry-pvc',
          namespace: props.namespace.metadata.name,
        },
        spec: {
          accessModes: ['ReadWriteOnce'],
          resources: {
            requests: {
              storage: '2Gi',
            },
          },
        },
      },
      {
        parent: this,
      },
    );

    const registryDeployment = new Deployment(
      'docker-registry',
      {
        metadata: {
          name: 'docker-registry',
          namespace: props.namespace.metadata.name,
        },
        spec: {
          replicas: 1,
          selector: { matchLabels: { app: 'docker-registry' } },
          template: {
            metadata: {
              labels: { app: 'docker-registry' },
            },
            spec: {
              containers: [
                {
                  name: 'docker-registry',
                  image: `registry:2`,
                  ports: [{ containerPort: 5000 }],
                  volumeMounts: [
                    {
                      name: 'registry-data',
                      mountPath: '/var/lib/registry',
                    },
                  ],
                },
              ],
              volumes: [
                {
                  name: 'registry-data',
                  persistentVolumeClaim: {
                    claimName: registryPVC.metadata.name,
                  },
                },
              ],
            },
          },
        },
      },
      {
        parent: this,
      },
    );

    // Define Service to expose Docker registry
    const registryService = new Service(
      'docker-registry-service',
      {
        metadata: {
          name: 'docker-registry',
          namespace: props.namespace.metadata.name,
        },
        spec: {
          selector: { app: 'docker-registry' },
          ports: [{ port: 5000, targetPort: 5000 }],
          type: 'ClusterIP', // Use appropriate service type based on your setup
        },
      },
      {
        parent: this,
      },
    );
  }
}
