import {gql} from 'graphql-tag';
//can add in viewer for easier auth
export const typeDefs = gql`
    enum UserRole {
        ADMIN
        USER
        GUEST
    }

    type User {
        id: ID!
        email: String!
        username: String!
        role: UserRole!
        createdAt: String!
        updatedAt: String!
        lastLogin:String!
        password:String!
    }

    type Query {
        getUsers: [User!]!
        getUser(id:ID!):User!
        viewer:User!
        testNeo4jConnection: String
        getSurvey(id: ID!): Survey
    }

    type Mutation{
        createUser(email:String!, username:String!, password:String!): User
        deleteUser(username:String!): User
        login(email:String!, password:String!): String
        changePassword(email:String!, password: String!): String

        createSurvey(id: ID!, title: String!): Survey
        createQuestion(surveyId: ID!, questionId: ID!, text: String!): Question
        removeQuestion(questionId: ID!): Question
        createAnswer(questionId: ID!, answerId: ID!, text: String!): Answer
        removeAnswer(answerId: ID!): Answer
    }

    type Survey {
        id: ID!
        title: String!
        firstQuestion: Question @relationship(type: "STARTS_WITH", direction: OUT)
    }
    
    type Question {
        id: ID!
        text: String!
        answers: [Answer!]! @relationship(type: "HAS_ANSWER", direction: OUT)
        next: [Question!]! @relationship(type: "LEADS_TO", direction: OUT)
    }
    
    type Answer {
        id: ID!
        text: String!
        question: Question @relationship(type: "ANSWER_OF", direction: IN)
        leadsTo: Question @relationship(type: "LEADS_TO", direction: OUT)
    } 
`;