import 'dotenv/config';
import mongoose from 'mongoose';
import { ApolloServer } from "apollo-server";

import { User as UserModel } from './models/user';
import Users from './dataSources/users';
import { typeDefs } from './typeDefs';
import { resolvers } from "./resolvers";

const uri = process.env.MONGODB_URI
const main = async() => {
    await mongoose.connect(uri, {
        useNewUrlParser:true,
        useUnifiedTopology:true
    });
};

main() //maybe turn to async/await after
    .then(console.log('🎉 connected to database successfully'))
    .catch(error=>console.error(error));

const dataSources = () => ({
    users: new Users(UserModel),
});

//import and create an instance of the Apollo Server
const server = new ApolloServer ({
    typeDefs,
    resolvers,
    dataSources
});

server.listen({port:process.env.PORT||4000}).then(({url})=>{
    console.log(`🚀 Server ready at ${url}`);
});