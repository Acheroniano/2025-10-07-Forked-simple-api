const { Client } = require('pg');
const express = require('express');

// Helper function to get database parameters
const getDbParams = () => {
    // 1. Check for standard individual environment variables (The ideal scenario)
    const host = process.env.DB_HOST;
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;

    if (host && user && password) {
        return { user, host, database: process.env.DB_DATABASE, password, port: process.env.DB_PORT || 5432 };
    }

    // 2. Fallback: Attempt to parse the DB_HOST variable as a JSON secret (Fix for the logged error)
    // NOTE: In a real-world app, you should check a dedicated secret variable, but using DB_HOST 
    // is a direct fix for the error where it became the invalid JSON string.
    try {
        const secretJsonString = process.env.DB_HOST || '';
        const secret = JSON.parse(secretJsonString);

        // Check if the parsed object contains connection details
        if (secret.host && secret.username && secret.password) {
            console.log('Using parsed JSON secret from DB_HOST for connection details.');
            return { 
                user: secret.username, 
                host: secret.host, 
                database: process.env.DB_DATABASE || secret.database, // Use DB_DATABASE or the one from the secret
                password: secret.password, 
                port: process.env.DB_PORT || secret.port || 5432
            };
        }
    } catch (e) {
        // Not a JSON string or structure is incorrect. Fall through to use individual env vars.
    }
    
    // 3. Use individual variables as last resort, even if incomplete (will still fail, but provides logging)
    console.log('Using individual environment variables, some may be missing or incorrect.');
    return {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 5432,
    }
}

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
            const dbParams = getDbParams();
            
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
            console.log(error)
            console.log(e)

            res.status(500);
            res.send(error)
        }
    })
})()