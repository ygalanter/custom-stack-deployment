import { it, expect } from '@jest/globals';
import { CustomStage, CustomStageProps } from '../src/index';
import { FileSet } from 'aws-cdk-lib/pipelines';
import { App, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

class MyDeployStage extends CustomStage {
  constructor(scope: Construct, id: string, props: CustomStageProps) {
    super(scope, id, props);

    new Stack(this, 'App', { stackName: 'AppStack' });
    new Stack(this, 'Database', { stackName: 'DatabaseStack' });
  }
}

class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new MyDeployStage(this, 'MyDeployStage', {
      synth: new FileSet('12345'),
      env: {
        account: '1234567890',
        region: 'af-south-1',
      },
    });
  }
}

const app = new App();
const pipelineStack = new PipelineStack(app, 'PipelineStack');
const myDeployStage = pipelineStack.node.children[0] as MyDeployStage;

it('Required custom CDK deployment commands are present', () => {
  expect(myDeployStage.commands[0]).toEqual(
    'npx cdk -a . deploy PipelineStack/MyDeployStage/App --require-approval never',
  );
  expect(myDeployStage.commands[1]).toEqual(
    'npx cdk -a . deploy PipelineStack/MyDeployStage/Database --require-approval never',
  );
});

it('Required policy to assume CDK roles is present', () => {
  expect(myDeployStage.rolePolicyStatements![0].actions).toEqual(['sts:AssumeRole']);
  expect(myDeployStage.rolePolicyStatements![0].resources).toEqual(['*']);
  expect(myDeployStage.rolePolicyStatements![0].conditions).toEqual({
    'ForAnyValue:StringEquals': {
      'iam:ResourceTag/aws-cdk:bootstrap-role': ['deploy', 'file-publishing', 'image-publishing'],
    },
  });
});

it('Custom stacks are present, and are instantiated in proper environment', () => {
  const appStack = myDeployStage.node.children[0] as Stack;
  expect(appStack.stackName).toEqual('AppStack');
  expect(appStack.account).toEqual('1234567890');
  expect(appStack.region).toEqual('af-south-1');

  const databaseStack = myDeployStage.node.children[1] as Stack;
  expect(databaseStack.stackName).toEqual('DatabaseStack');
  expect(databaseStack.account).toEqual('1234567890');
  expect(databaseStack.region).toEqual('af-south-1');
});
