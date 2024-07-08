import { ComponentResource } from '@pulumi/pulumi';
import {
  Namespace,
  PersistentVolume,
  PersistentVolumeClaim,
  ConfigMap,
  Service,
} from '@pulumi/kubernetes/core/v1';
import { StatefulSet, Deployment } from '@pulumi/kubernetes/apps/v1';

interface ScanWebDbProps {
  namespace: Namespace;
}

export default class ScanWebDb extends ComponentResource {
  constructor(name: string, props: ScanWebDbProps) {
    super('custom:resource:ScanWebDb', name);

    const postgresDeployment = new Deployment(
      'postgres-deployment',
      {
        metadata: {
          name: 'scanweb-postgres',
          namespace: props.namespace.metadata.name,
        },
        spec: {
          selector: { matchLabels: { app: 'postgres' } },
          replicas: 1,
          template: {
            metadata: {
              labels: { app: 'postgres' },
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
                    { name: 'POSTGRES_DB', value: 'scanweb' }, // Replace with your database name
                    { name: 'POSTGRES_USER', value: 'scanweb' }, // Replace with your database user
                    { name: 'POSTGRES_PASSWORD', value: 'scanweb_password' }, // Replace with your database password
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
          selector: { app: 'postgres' },
          ports: [{ port: 5433, targetPort: 5432 }],
        },
      },
      { parent: this },
    );
  }
}
