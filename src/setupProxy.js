// Site must be Cross Origin isolated in order to use SharedArrayBuffer
// Hack: Set up a proxy with middleware to enable Cross Origin isolation on dev server.
// In prod server, should be a setting on host (Netlify, etc.)

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
        next();
    });
};