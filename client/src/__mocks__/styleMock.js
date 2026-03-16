// Returns a Proxy that returns the property name for any accessed key,
// so styles.foo → "foo" instead of undefined.
const handler = {
  get(target, prop) {
    return prop;
  },
};
module.exports = new Proxy({}, handler);
