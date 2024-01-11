import 'dotenv/config';
import mongoose from 'mongoose';

import { Neo4jGraphQL } from '@neo4j/graphql';
import neo4j from 'neo4j-driver';
import Neo4jDataSource from './dataSources/neo4jDataSource.js';

import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

import { User as UserModel } from './models/user.js';
import Users from './dataSources/users.js';
import { typeDefs } from './typeDefs.js';
import { resolvers, verifyUser } from "./resolvers.js";

const uri = process.env.MONGODB_URI

async function main() {
    try {
        // Connect to MongoDB using mongoose package
        await mongoose.connect(uri, { 
            useNewUrlParser: true, 
            useUnifiedTopology: true 
        });
        console.log('🎉 connected to MongoDB successfully');

        // Initialize Neo4j driver
        const neo4jURI = process.env.NEO4J_URI;
        const neo4jUser = process.env.NEO4J_USER;
        const neo4jPassword = process.env.NEO4J_PASSWORD;
        const driver = neo4j.driver(neo4jURI, neo4j.auth.basic(neo4jUser, neo4jPassword));

        // Create and augment schema with Neo4jGraphQL
        const neoSchema = new Neo4jGraphQL({ typeDefs, resolvers, driver });
        const schema = await neoSchema.getSchema();

        // Start Apollo Server
        await startServer(schema, driver);
        console.log(`Connected to Aura`);
    } catch (error) {
        console.error('Error starting the server:', error);
    }
}

async function startServer(schema, driver) {
    const server = new ApolloServer({
        schema,
    });

    const { url } = await startStandaloneServer(server, {
        //verify user identity
        context: async ({ req }) => new ContextValue({req,server,driver}),
        // listen: {port:4000}, //do we need this?
    });
    console.log(`🚀 Server ready at ${url}`);
}

// Run the main function
main().catch((error) => console.error(error));

//contextValue class to access the entire context's value within the DataSource
class ContextValue {
    constructor({ req, driver }){
        let verifiedUser = null;

        //if headers has token, check token
        if (req.headers.authorization) {
            const token = req.headers.authorization.split(' ')[1]; // Get the token part
            verifiedUser = verifyUser(token);
        }

        // if token is good, then enable this.user
        if (verifiedUser && !verifiedUser.error) {
            this.user = verifiedUser.user;
        } else {
            this.user = null; // Set explicitly to null if there's no verified user or if there's an error
        }
        // const { cache } = server;  //Do we need to extract the cache property from the 'server' object?

        //have dataSources accessable from ContextValue object (update to apollo4)
        this.dataSources = {
            // mongodb data source for login info
            users: new Users(UserModel),
            // Neo4j data source
            neo4j: new Neo4jDataSource(driver),
        };
    }
}
