// pm2 config for the unified artificialatheist.com Next app (publication +
// quiz + debate), matching the lab980 convention.
//   cd /var/www/artificial-atheist
//   pm2 start deploy/ecosystem.config.js && pm2 save
module.exports = {
  apps: [
    {
      name: "artificial-atheist",
      cwd: "/var/www/artificial-atheist",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: 8060,
      },
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
