```js
// index.js
// Ready-to-run Express API that connects to PostgreSQL using AWS Secrets Manager credentials.

const express = require("express");
const { Client } = require("pg");
const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");

const REGION = "sa-east-1";
const SECRET_NAME = "rds!cluster-fc8b301d-615a-4cb1-8699-ba523d7fe668";
const PORT = process.env.API_PORT || 3000;

// Create the Secrets Manager client
const secretsClient = new SecretsManagerClient({ region: REGION });

// Helper to fetch and parse the database secret
async function getDbSecret() {
  try {
    console.log("Fetching secret from AWS Secrets Manager...");
    const response = await secretsClient.send(
      new GetSecretValueCommand({
        SecretId: SECRET_NAME,
        VersionStage: "AWSCURRENT",
      })
    );

    const secretString = response.SecretString;
    const secret = JSON.parse(secretString);

    console.log("✅ Secret successfully retrieved from AWS.");

    // Return the parameters directly in the pg format
    return {
      user: secret.username,
      host: secret.host,
      database: secret.dbname,
      password: secret.password,
      port: secret.port || 5432,
    };
  } catch (error) {
    console.error("❌ Failed to retrieve secret:", error.message);
    throw error;
  }
}

async function startServer() {
  const app = express();
  let requestCount = 0;

  // Health-check route
  app.get("/", (req, res) => {
    requestCount++;
    res.json({ message: "API OK!", request_id: requestCount });
  });

  // Database connection test route
  app.get("/connect", async (req, res) => {
    requestCount++;
    try {
      const dbParams = await getDbSecret();

      const client = new Client(dbParams);
      await client.connect();

      const result = await client.query("SELECT version()");
      const version = result.rows[0].version;

      await client.end();

      res.json({
        message: "Conectado ao banco com sucesso!",
        version,
        request_id: requestCount,
      });
    } catch (error) {
      console.error("❌ Erro ao se conectar ao banco:", error);
      res.status(500).json({
        message: "Erro ao se conectar ao banco",
        request_id: requestCount,
        detail: error.message,
      });
    }
  });

  // Start the API
  app.listen(PORT, () => {
    console.log(`🚀 API iniciada. Escutando na porta ${PORT}`);
  });
}

// Run the app
startServer().catch((err) => {
  console.error("❌ Falha ao iniciar a aplicação:", err);
  process.exit(1);
});
```
