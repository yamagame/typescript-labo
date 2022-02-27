import { hello } from './hello/test';

/**
 * component
 *
 * @param name your name
 * @param className component class
 */
function component(name: string, className: string) {
  // hello component1
  // hello component2
  return (
    <>
      {/* JSX comment */}
      <div className={className}>{`${hello}, ${name}!`}</div>
    </>
  );
}

// print component
console.log(component('Taro', 'sample1 sample2')); /* trailing comment 1 */
// print hello
/* leading comment */ console.log('hello'); /* trailing comment 2 */
