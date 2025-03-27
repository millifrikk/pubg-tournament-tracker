const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/api', // No rewrite needed, but included for clarity
      },
      // Add better handling for errors
      onError: (err, req, res) => {
        console.error('Proxy Error:', err);
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({
          error: 'Proxy error connecting to API',
          message: err.message
        }));
      },
      // Increase timeout values
      proxyTimeout: 120000, // 2 minutes
      timeout: 120000,      // 2 minutes
      // Adjust headers
      headers: {
        Connection: 'keep-alive'
      }
    })
  );
};
