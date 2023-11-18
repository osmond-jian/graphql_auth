import 'dotenv/config';
import mongoose from 'mongoose';
// import express from 'express';

import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

import { User as UserModel } from './models/user.js';
import Users from './dataSources/users.js';
import { typeDefs } from './typeDefs.js';
import { resolvers, verifyUser } from "./resolvers.js";

const uri = process.env.MONGODB_URI

//connect to mongodb using mongoose package
const main = async() => {
    await mongoose.connect(uri, {
        useNewUrlParser:true,
        useUnifiedTopology:true
    });
};

//contextValue class to access the entire context's value within the DataSource
class ContextValue {
    constructor({ req }){
        // const token = req.headers.authorization;
        // console.log("Received token:", token);  // Logging the token

        // const verifiedUser = token ? verifyUser(token) : null;
        // console.log("Verified user:", verifiedUser);  // Logging the verified user

        let verifiedUser = null;

        if (req.headers.authorization) {
            const token = req.headers.authorization.split(' ')[1]; // Get the token part
            verifiedUser = verifyUser(token);
        }

        // this.user = verifiedUser.user && !verifiedUser.error ? verifiedUser.user : null;

        if (verifiedUser && !verifiedUser.error) {
            this.user = verifiedUser.user;
        } else {
            this.user = null; // Set explicitly to null if there's no verified user or if there's an error
        }
        // const { cache } = server;  //Do we need to extract the cache property from the 'server' object?
        this.dataSources = {
            users: new Users(UserModel),
        };
    }
}

main() //maybe turn to async/await after
    .then(()=>{
        console.log('🎉 connected to mongoDB successfully');
        //Start ApolloServer
        startServer();
    })
    .catch((error)=>console.error(error))

//call express
// const app = express();

//import and create an instance of the Apollo Server
const server = new ApolloServer ({
    typeDefs,
    resolvers,
});

// this code is for not using express!!!
const startServer = async () => {
    const { url } = await startStandaloneServer (server, {
        typeDefs,
        resolvers,
        //verify user identity
        context: async ({ req }) => new ContextValue({req,server}),
        // listen: {port:4000}, //do we need this?
    });
    console.log(`🚀 Server ready at ${url}`);
};


// // Apollo middleware
// app.use('/graphql', expressMiddleware(server, {
//     // Apollo sandbox settings (if needed)
// }));

// // Start the server
// const startExpressServer = async () => {
//     await server.start();
//     app.listen({ port: 4000 }, () =>
//         console.log(`🚀 Server ready at http://localhost:4000/graphql`)
//     );
// };

// startExpressServer();