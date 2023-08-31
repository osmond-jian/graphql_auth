import {gql} from 'apollo-server';

export const typeDefs = gql`
    type User {
        email:String!
        username:String!
        password:String!
    }

    type Query {
        getUsers: [User!]!,
        getUser(id:ID!):User!
    }

    type Mutation{
        createUser(email:String!, username:String!, password:String!): User!
        deleteUser(username:String!): User!
    }
`;