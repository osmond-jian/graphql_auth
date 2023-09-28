import 'dotenv/config';
import mongoose from 'mongoose';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

import { User as UserModel } from './models/user.js';
import Users from './dataSources/users.js';
import { typeDefs } from './typeDefs.js';
import { resolvers } from "./resolvers.js";
import verifyUser from './resolvers.js';

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
    constructor({req, server}){
        this.token = verifyUser(req.headers.authorization);
        // const visitor = req.headers.authorization || null;
        // this.token = getUser(visitor); //change to the actual token validation

        // if (!visitor) {
        //     this.token = undefined;
        // }

        const { cache } = server;
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
    .catch((error)=>console.error(error));

//import and create an instance of the Apollo Server
const server = new ApolloServer ({
    typeDefs,
    resolvers,
});

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


// server.listen({port:process.env.PORT||4000}).then(({url})=>{
//     console.log(`🚀 Server ready at ${url}`);
// });
