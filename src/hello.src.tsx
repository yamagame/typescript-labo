import { hello } from './hello/test';

/**
 * component
 *
 * @param name your name
 * @param className component class
 */
function functionComponent(name: string, className: string) {
  // hello component1
  // hello component2

  function internalFunction() {
    return <div>Hello World</div>;
  }

  const internalArrowFunction = () => {
    return <div>Hello World</div>;
  };

  return (
    <>
      {/* JSX comment */}
      <div className={className}>{`${hello}, ${name}!`}</div>
    </>
  );
}

export function helloFunction() {
  return `Hello`;
}

async function helloFunctionAsync() {
  return `Hello`;
}

// print component
console.log(
  functionComponent('Taro', 'sample1 sample2')
); /* trailing comment 1 */
// print hello
/* leading comment */ console.log('hello'); /* trailing comment 2 */

export const arrowComponent1 = () => <div>Hello World</div>;

const arrowComponent2 = () => <div />;

const arrowComponent3 = () => {
  return <div>Hello World</div>;
};

const arrowComponent1Async = async () => <div>Hello World</div>;

const arrowComponent2Async = async () => <div />;

export const arrowComponent3Async = async () => {
  return <div>Hello World</div>;
};

const arrowComponent4Async = async () => {
  const val = {
    a: 100,
    b: 200,
    c: 300,
  };
  const { a, b } = val;
  return (
    <>
      <div>
        Hello World {a} {b}
      </div>
    </>
  );
};

const arrow1Async = async () => 'hello';
