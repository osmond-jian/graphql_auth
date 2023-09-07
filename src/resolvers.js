import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
const SECRET = process.env.SECRET

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
        createUser: async (_, args, {dataSources:{users}}) => {
            const newUser = {
                email: args.email,
                username: args.username,
                password: args.password
            }
            newUser.password = await bcrypt.hash(args.password, 12);
            return users.createUser(newUser);
        },

        deleteUser: async (_, args, {dataSources:{users}}) => {
            return users.deleteUser(args);
        },

        login: async (_, args, {dataSources:{users}}) => {
            const account = await users.getUser(args);
            // const nameUser = users.getUser(args.username);
            console.log('the args password is '+args.password+' and the datasource pw is '+account.password);
            if (!account) {
                throw new Error ("No User found");
            }
    
            // if (!nameEmail && nameUser) {
            //     username = nameUser;
            // }
            //check if password matches
            const isValid = await bcrypt.compare(args.password, account.password);
            if (!isValid){
                throw new Error ("The username/email or password is incorrect.");
            }
    
            //sign in user, and if users exists then create a token for them
            const token = await jwt.sign (
                {
                    user:account
                },
                SECRET,
                {expiresIn:"1d"}
            );
            console.log("You have successfully logged in!");
            return token;
        }
    }
}