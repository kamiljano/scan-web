import { Deployment } from '@pulumi/kubernetes/apps/v1';
import {
  Namespace,
  PersistentVolumeClaim,
  Secret,
  Service,
} from '@pulumi/kubernetes/core/v1';
import { ComponentResource } from '@pulumi/pulumi';

interface DockerRegistryProps {
  namespace: Namespace;
}

export default class DockerRegistry extends ComponentResource {
  constructor(name: string, props: DockerRegistryProps) {
    super('custom:resource:DockerRegistry', name);

    const secret = new Secret(
      'docker-registry-secret',
      {
        metadata: {
          name: 'docker-registry-secret',
          namespace: props.namespace.metadata.name,
        },
      },
      {
        parent: this,
      },
    );

    const pvc = new PersistentVolumeClaim(
      'registry-pvc',
      {
        metadata: {
          namespace: props.namespace.metadata.name,
          name: 'registry-pvc',
        },
        spec: {
          accessModes: ['ReadWriteOnce'],
          resources: {
            requests: {
              storage: '10Gi',
            },
          },
        },
      },
      {
        parent: this,
      },
    );

    const appLabels = { app: 'registry' };
    new Deployment(
      'registry-deployment',
      {
        metadata: {
          namespace: props.namespace.metadata.name,
          name: 'docker-registry',
        },
        spec: {
          selector: { matchLabels: appLabels },
          replicas: 1,
          template: {
            metadata: { labels: appLabels },
            spec: {
              containers: [
                {
                  name: 'registry',
                  image: 'registry:2',
                  ports: [{ containerPort: 5000 }],
                  volumeMounts: [
                    {
                      mountPath: '/var/lib/registry',
                      name: 'registry-storage',
                    },
                  ],
                },
              ],
              volumes: [
                {
                  name: 'registry-storage',
                  persistentVolumeClaim: {
                    claimName: pvc.metadata.name,
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

    new Service(
      'registry-service',
      {
        metadata: {
          namespace: props.namespace.metadata.name,
          name: 'docker-registry',
        },
        spec: {
          type: 'ClusterIP',
          selector: appLabels,
          ports: [
            {
              port: 5000,
              targetPort: 5000,
            },
          ],
        },
      },
      {
        parent: this,
      },
    );
  }
}
