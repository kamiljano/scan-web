import { ComponentResource, interpolate } from '@pulumi/pulumi';
import {
  ContainerRegistry,
  ContainerRegistryDockerCredentials,
} from '@pulumi/digitalocean';
import { Image } from '@pulumi/docker';
import * as path from 'node:path';

interface DigitalOceanContainerRegistryProps {}

export default class DigitalOceanContainerRegistry extends ComponentResource {
  constructor(name: string, props: DigitalOceanContainerRegistryProps) {
    super('custom:resource:DigitalOceanContainerRegistry', name);

    const registry = new ContainerRegistry(
      'registry',
      {
        name: 'scan-web',
        region: 'sfo3',
        subscriptionTierSlug: 'starter',
      },
      {
        parent: this,
      },
    );

    const creds = new ContainerRegistryDockerCredentials(
      'myRegistryCreds',
      {
        registryName: registry.name,
      },
      {
        parent: this,
      },
    );

    creds.dockerCredentials.apply((creds) => {
      const credData = JSON.parse(creds);
      new Image(
        'scan-web-image',
        {
          build: {
            context: path.resolve(__dirname, '..', '..'),
          },
          imageName: interpolate`${registry.endpoint}/scan-web:latest`,
          registry: {
            server: registry.endpoint,
            username: credData.auths[registry.endpoint].username,
            password: creds.dockerCredentials.apply(
              (creds) => creds.dockerPassword,
            ),
          },
        },
        {
          parent: this,
        },
      );
    });
  }
}
