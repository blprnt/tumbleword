module.exports = {
  apps: [
    {
      name: "tumbleword",
      script: "server.js",
      env: {
        PORT: 3000,
        NODE_ENV: "production",
      },
      restart_delay: 1000,
      max_restarts: 10,
    },
  ],
};
