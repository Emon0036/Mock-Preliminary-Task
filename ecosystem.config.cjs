module.exports = {
  apps: [
    {
      name: "mock-preliminary-task",
      script: "app.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
