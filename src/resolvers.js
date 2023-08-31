export const resolvers = {
    Query:{
        getUsers: async (_, _args, {dataSources:{users}}) => {
            return users.getUsers(); //sample data change later
        },
        getUser: (_, {id}, {dataSources:{users}}) => {
            return users.getUser(id);
        }
    },

    Mutation: {
        createUser: (_, args, {dataSources:{users}}) => {
            return users.createUser(args);
        },

        deleteUser: (_, args, {dataSources:{users}}) => {
            return users.deleteUser(args);
        }
    }
}