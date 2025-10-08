import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
const { Client } = require('pg');
const express = require('express');

// AWS Secrets Manager Configuration
const secret_name = "rds!cluster-fc8b301d-615a-4cb1-8699-ba523d7fe668";
const secretsManagerClient = new SecretsManagerClient({
  region: "sa-east-1",
});

// Cache for the retrieved secret
let cachedSecret = null;
let secretFetchTime = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// Helper function to get the secret value from AWS Secrets Manager with caching
const getSecretFromAWS = async () => {
    const now = Date.now();
    
    // Return cached secret if it's still valid
    if (cachedSecret && (now - secretFetchTime) < CACHE_DURATION_MS) {
        console.log('Using cached secret');
        return cachedSecret;
    }

    console.log('Fetching secret from AWS Secrets Manager');
    try {
        const response = await secretsManagerClient.send(
            new GetSecretValueCommand({
                SecretId: secret_name,
                VersionStage: "AWSCURRENT",
            })
        );
        
        const secret = JSON.parse(response.SecretString);
        cachedSecret = secret;
        secretFetchTime = now;
        return secret;
    } catch (error) {
        console.error('Error fetching secret from AWS:', error);
        throw error;
    }
};

// Helper function to get database parameters
const getDbParams = async () => {
    // 1. Check for standard individual environment variables first (highest priority)
    const host = process.env.DB_HOST;
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;

    if (host && user && password) {
        console.log('Using individual environment variables for database connection');
        return { 
            user, 
            host, 
            database: process.env.DB_DATABASE, 
            password, 
            port: process.env.DB_PORT || 5432 
        };
    }

    // 2. Attempt to parse the DB_HOST variable as a JSON secret (second priority)
    try {
        const secretJsonString = process.env.DB_HOST || '';
        const secret = JSON.parse(secretJsonString);

        if (secret.host && secret.username && secret.password) {
            console.log('Using parsed JSON secret from DB_HOST for connection details.');
            return { 
                user: secret.username, 
                host: secret.host, 
                database: process.env.DB_DATABASE || secret.database,
                password: secret.password, 
                port: process.env.DB_PORT || secret.port || 5432
            };
        }
    } catch (e) {
        // Not a JSON string or structure is incorrect, continue to next option
    }
    
    // 3. Fetch from AWS Secrets Manager (lowest priority)
    try {
        const secret = await getSecretFromAWS();
        console.log('Using secret from AWS Secrets Manager for connection details.');
        return {
            user: secret.username,
            host: secret.host,
            database: secret.database,
            password: secret.password,
            port: secret.port || 5432
        };
    } catch (error) {
        console.error('Failed to retrieve secret from AWS Secrets Manager:', error);
        throw error;
    }
};

(async () => {
    const app = express()
    const port = process.env.API_PORT || 3000
    let i = 0

    app.listen(port, () => {
        console.log(`API iniciada. Escutando PORT ${port}`)
    })

    app.use((req, res, next) => {
        i++;
        next();
    })

    app.get('/', async (req, res) => {
        const response = { 'message': "API OK!", 'request_id': i }
        console.log(response)
        res.send(response)
    })

    app.get('/connect', async (req, res) => {
        try {
            // Get connection parameters using the helper function
            const dbParams = await getDbParams();
            
            // Check if essential parameters are present (host, user, password)
            if (!dbParams.host || !dbParams.user || !dbParams.password) {
                 throw new Error("Missing essential database connection parameters (Host, User, or Password).");
            }
            
            const client = new Client(dbParams);
            
            await client.connect()

            const result = await client.query('SELECT version()')
            const version = result.rows[0].version
            await client.end()

            const response = { 'message': "Conectado ao banco", 'version': version, 'request_id': i }
            console.log(response)
            res.send(response)
        } catch (e) {
            const error = { 'message': 'Erro ao se conectar ao banco', 'request_id': i, 'detail': e.message }
            // Log environment variables for debugging
            console.log('Environment Variables:')
            console.log('DB_HOST:', process.env.DB_HOST)
            console.log('DB_USER:', process.env.DB_USER)
            console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET')
            console.log('DB_DATABASE:', process.env.DB_DATABASE)
            console.log('DB_PORT:', process.env.DB_PORT)
            console.log('API_PORT:', process.env.API_PORT)

            console.log(error)
            console.log(e)

            res.status(500);
            res.send(error)
        }
    })
})()
```