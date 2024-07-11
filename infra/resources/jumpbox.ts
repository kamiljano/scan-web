import { Pod, Namespace } from '@pulumi/kubernetes/core/v1';

interface JumpboxProps {
  namespace: Namespace;
}

export default class Jumpbox extends Pod {
  constructor(id: string, props: JumpboxProps) {
    super(id, {
      metadata: {
        name: id,
        namespace: props.namespace.metadata.name,
        labels: {
          name: 'jumpbox',
        },
      },
      spec: {
        containers: [
          {
            name: 'ubuntu',
            image: 'ubuntu:latest',
            command: [
              '/bin/bash',
              '-c',
              'apt-get update && apt-get install -y postgresql && (while true; do echo hello; sleep 10;done)',
            ],
          },
        ],
      },
    });
  }
}
