import { defineRailway, github, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const spinTheBlockVolume = volume("spin-the-block-volume", {
    alerts: { usage: { "100": {}, "80": {}, "95": {} } },
    allowOnlineResize: true,
    region: "us-west2",
    sizeMB: 5000,
  });
  const spinTheBlock = service("spin-the-block", {
    source: github("amancodeshere/hood-warfare-monopoly", {
      branch: "main",
      checkSuites: true,
    }),
    build: { builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    healthcheck: "/api/health",
    healthcheckTimeout: 120,
    deploy: { restartPolicyType: "ON_FAILURE", restartPolicyMaxRetries: 10 },
    replicas: { "us-west2": 1 },
    volumeMounts: { "/data": spinTheBlockVolume },
  });

  return project("hood-warfare-monopoly", {
    variables: { managed: false },
    resources: [spinTheBlock, spinTheBlockVolume],
  });
});
