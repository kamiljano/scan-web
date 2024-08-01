import { ComponentResource, ComponentResourceOptions } from '@pulumi/pulumi';
import * as fs from 'node:fs';
import { CustomResource } from '@pulumi/kubernetes/apiextensions';
import * as yaml from 'js-yaml';
import { Namespace } from '@pulumi/kubernetes/core/v1';
import { ConfigFile } from '@pulumi/kubernetes/yaml';
import * as path from 'node:path';

interface ArgoWorkflowsProps {
  namespace: Namespace;
  workflows: string[];
  containerRegistry: string;
}

export default class ArgoWorkflows extends ComponentResource {
  constructor(
    name: string,
    props: ArgoWorkflowsProps,
    opts?: ComponentResourceOptions,
  ) {
    super('custom:resource:ArgoWorkflows', name, opts);

    new ConfigFile(
      'argo',
      {
        file: 'https://raw.githubusercontent.com/argoproj/argo-workflows/master/manifests/quick-start-postgres.yaml',
        transformations: [
          (obj: any) => {
            if (obj.metadata) {
              obj.metadata.namespace = props.namespace;
            }
          },
        ],
      },
      { parent: this },
    );

    for (const workflow of props.workflows) {
      const ccScanWorkflowTemplate = fs.readFileSync(workflow, 'utf-8');
      const data = yaml.load(ccScanWorkflowTemplate) as any;
      data.metadata.namespace = props.namespace;
      data.spec.templates.forEach((template: any) => {
        if (template.container?.image) {
          const parts = template.container.image.split('/');
          const image = parts[parts.length - 1];
          template.container.image = `${props.containerRegistry}/${image}`;
        }
      });
      new CustomResource(`workflow-${path.parse(workflow).name}`, data, {
        parent: this,
      });
    }
  }
}
