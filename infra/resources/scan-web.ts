import { ComponentResource } from '@pulumi/pulumi';
import {
  Namespace,
  PersistentVolumeClaim,
  Service,
} from '@pulumi/kubernetes/core/v1';
import { Deployment } from '@pulumi/kubernetes/apps/v1';
import { NetworkPolicy } from '@pulumi/kubernetes/networking/v1';

interface ScanWebDbProps {
  namespace: Namespace;
}

const postgresSelector = { app: 'postgres' };

export default class ScanWeb extends ComponentResource {
  constructor(
    name: string,
    private readonly props: ScanWebDbProps,
  ) {
    super('custom:resource:ScanWeb', name);

    const postgresDeployment = new Deployment(
      'postgres-deployment',
      {
        metadata: {
          name: 'scanweb-postgres',
          namespace: props.namespace.metadata.name,
        },
        spec: {
          selector: { matchLabels: postgresSelector },
          replicas: 1,
          template: {
            metadata: {
              labels: postgresSelector,
            },
            spec: {
              securityContext: {
                fsGroup: 999, // PostgreSQL Docker images run as uid 999 by default
              },
              containers: [
                {
                  name: 'postgres',
                  image: 'postgres:latest', // You can specify a different version of PostgreSQL here
                  env: [
                    // todo: auto-generate the secrets
                    { name: 'POSTGRES_DB', value: 'scanweb' },
                    { name: 'POSTGRES_USER', value: 'scanweb' },
                    { name: 'POSTGRES_PASSWORD', value: 'scanweb_password' },
                  ],
                  ports: [{ containerPort: 5432 }],
                  volumeMounts: [
                    {
                      name: 'postgres-storage',
                      mountPath: '/var/lib/postgresql/data',
                    },
                  ],
                },
              ],
              volumes: [
                {
                  name: 'postgres-storage',
                  persistentVolumeClaim: {
                    claimName: 'postgres-pvc',
                  },
                },
              ],
            },
          },
        },
      },
      { parent: this },
    );

    // Create a PersistentVolumeClaim for PostgreSQL storage
    const postgresPVC = new PersistentVolumeClaim(
      'scanweb-postgres-pvc',
      {
        metadata: {
          name: 'postgres-pvc',
          namespace: props.namespace.metadata.name,
        },
        spec: {
          accessModes: ['ReadWriteMany'],
          resources: {
            requests: {
              storage: '5Gi', // You can adjust the storage size here
            },
          },
        },
      },
      { parent: this },
    );

    // Expose the PostgreSQL Deployment as a Service internally within the cluster
    const postgresService = new Service(
      'postgres-service',
      {
        metadata: {
          name: 'scanweb-postgres',
          namespace: props.namespace.metadata.name,
        },
        spec: {
          selector: postgresSelector,
          ports: [{ port: 5433, targetPort: 5432 }],
        },
      },
      { parent: this },
    );
  }

  get db() {
    const self = this;
    return {
      grantAccess(policyName: string, namespace: Namespace) {
        new NetworkPolicy(
          policyName,
          {
            metadata: {
              name: policyName,
              namespace: self.props.namespace.metadata.name,
            },
            spec: {
              podSelector: { matchLabels: postgresSelector },
              policyTypes: ['Ingress'],
              ingress: [
                {
                  from: [
                    {
                      namespaceSelector: {
                        matchLabels: {
                          name: namespace.metadata.name,
                        },
                      },
                    },
                  ],
                  ports: [
                    {
                      protocol: 'TCP',
                      port: 5433,
                    },
                  ],
                },
              ],
            },
          },
          { parent: self },
        );
      },
    };
  }
}
