export const $vars = new Proxy({}, {
    get(_target, _prop) {
        return Symbol(String(_prop));
    },
});
