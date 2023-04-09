This library allows custom stack deployment to the AWS regions where regular CDK pipeline deployment isn't supported yet. The declaration and usage of custom stage is almost identical to using regular CDK stage

### Declaration
```ts
import { CustomStage, CustomStageProps } from 'custom-stack-deployment';

// additional props that can be passed to custom stage
export interface CustomApplicationStageProps extends CustomStageProps {
  vpcID: string;
}

// declare custom deployment stage
export class CustomApplicationStage extends CustomStage {
  constructor(scope: Construct, id: string, props: CustomApplicationStageProps) {
    super(scope, id, props);

    // instantiate application stacks
    new ApplicationStack(this, 'app', {
      stackName: 'AppStack',
      // pass additional props to the stacks
      vpcID: props.vpcID,
    });
  }
}

```
### Usage
```ts
// instantiate the custom stage
const customDeploymentApp = new CustomApplicationStage(this, 'CustomStage', {
  // pass synth step of the pipeline
  synth: pipeline.synth,
  // set environment where stage's stacks will be deployed
  env: {
    account: '1234567890',
    region:  'af-south-1',
  },
  // pass additional props to the stacks
  vpcID: 'vpc0987654321'
});

// add stage to the pipeline's wave
const wave = pipeline.addWave('CustomWave');
wave.addPost(customDeploymentApp);

```
