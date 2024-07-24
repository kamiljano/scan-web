import { ComponentResource } from '@pulumi/pulumi';
import { Namespace } from '@pulumi/kubernetes/core/v1';
import Postgres from './postgres';

interface ScanWebProps {
  namespace: Namespace;
}

export default class ScanWeb extends ComponentResource {
  constructor(name: string, props: ScanWebProps) {
    super('custom:resource:ScanWeb', name);

    new Postgres(
      'postgres',
      {
        namespace: props.namespace,
      },
      {
        parent: this,
      },
    );
  }
}
