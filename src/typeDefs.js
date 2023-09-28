import {gql} from 'graphql-tag';
//can add in viewer for easier auth
export const typeDefs = gql`
    type User {
        email:String!
        username:String!
        password:String!
    }

    type Query {
        getUsers: [User!]!
        getUser(id:ID!):User!
        viewer:User!
    }

    type Mutation{
        createUser(email:String!, username:String!, password:String!): User
        deleteUser(username:String!): User
        login(email:String!, password:String!): String
    }
`;