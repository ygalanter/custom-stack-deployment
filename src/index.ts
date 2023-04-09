import { Stack } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { CodeBuildStep, IFileSetProducer } from 'aws-cdk-lib/pipelines';
import { Construct, Dependable, Node } from 'constructs';

// extending CDK's native Node class so that we can intercept
// when stack is added - then we can add that stack to custom deploy commands
class CustomNode extends Node {
  constructor(host: Construct & CodeBuildStep, scope: Construct, id: string) {
    super(host, scope, id);

    // overriding original Node.addChild command
    this['addChild'] = (child: Construct, childName: string) => {
      super['addChild'](child, childName);

      // to add stack to custom deploy command
      if (child instanceof Stack) {
        host.commands.push(`npx cdk -a . deploy ${host.node.path}/${childName} --require-approval never`);
      }
    };
  }
}

/**
 * Props for CustomStage constructor
 */
export interface CustomStageProps {
  /**
   * CodePipeline's synth step
   */
  synth: IFileSetProducer;
  /**
   * Environment where stacks CustomStage will deploy stacks
   */
  env: {
    account: string;
    region: string;
  };
}

// Custom stacks deployment to regions where CDK deployment is nor supported
export class CustomStage extends CodeBuildStep {
  node: CustomNode;
  constructor(scope: Construct, id: string, props: CustomStageProps) {
    super(id, {
      input: props.synth,
      rolePolicyStatements: [
        new PolicyStatement({
          actions: ['sts:AssumeRole'],
          resources: ['*'],
          conditions: {
            'ForAnyValue:StringEquals': {
              'iam:ResourceTag/aws-cdk:bootstrap-role': ['deploy', 'file-publishing', 'image-publishing'],
            },
          },
        }),
      ],
      buildEnvironment: {
        privileged: true, // for docker support
      },
      commands: [],
    });

    // from the constructor of Construct class
    // this allows our custom class act as a Construct
    this.node = new CustomNode(this, scope, id);
    Dependable.implement(this, {
      dependencyRoots: [this],
    });
  }
}
