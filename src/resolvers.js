import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
const SECRET = process.env.SECRET

//get the user info from JWT 
export function verifyUser(token){
    if (token){
        try{
            return jwt.verify(token, SECRET);
        } catch (err) {
            return{error:true, msg:"No token found"};
        }
    }
    //may refactor out later
    if (!token) {
        return { error: true, msg: "No token provided" };
    }
}

// Higher-order function for authorization
function requireAdminRole(resolverFunction) {
    return async (_, args, contextValue, info) => {
        if (!contextValue.user || contextValue.user.role !== 'ADMIN') {
            throw new Error(`User is NOT authorized - User.role is ${contextValue.user?.role}`);
        }
        return resolverFunction(_, args, contextValue, info);
    };
}

export const resolvers = {
    Query:{
        getUsers: requireAdminRole(async (_, _args, contextValue) => {
            const userList = await contextValue.dataSources.users.getUsers();
            return userList || [];
        }),
        getUser: (_, {id}, contextValue) => {
            return contextValue.dataSources.users.getUser(id);
        }
        // viewer: (_, args, {user}) => {
        //     return users.find(({id})=> id === user.sub);
        // }
    },

    Mutation: {
        createUser: async (_, args, contextValue) => {
            const hashedPassword = await bcrypt.hash(args.password, 12);
            const newUser = {
                email: args.email,
                username: args.username,
                password: hashedPassword,
                role:'USER',
                lastLogin:new Date(),
            };

            return contextValue.dataSources.users.createUser(newUser);
        },

        deleteUser: async (_, args, contextValue) => {
            return contextValue.dataSources.users.deleteUser(args);
        },

        login: async (_, args, contextValue) => {
            const user = await contextValue.dataSources.users.getUser(args);

            if (!user) {
                throw new Error ("No User found");
            }

            const isValid = await bcrypt.compare(args.password, user.password);
            if (!isValid){
                throw new Error ("The username/email or password is incorrect.");
            }
    
            //sign in user, and if users exists then create a token for them
            const token = await jwt.sign (
                {
                    user:{
                        id:user.username,
                        role:user.role
                    }
                },
                SECRET,
                {expiresIn:"1d"}
            );
            return token;
        },

        changePassword: async (_, args, contextValue) => {
            if (!contextValue.user) {
                throw new Error("Not authenticated");
            }
        
            try {
                // Assuming contextValue.user.id is the ID of the authenticated user
                const user = await UserModel.findById(contextValue.user.id);
                if (!user) {
                    throw new Error("User not found");
                }
        
                // Verify the old password
                const isMatch = await bcrypt.compare(args.currentPassword, user.password);
                if (!isMatch) {
                    throw new Error("Current password is incorrect");
                }
        
                // Hash the new password
                const newPassword = await bcrypt.hash(args.newPassword, 12);
        
                // Update the user's password
                user.password = newPassword;
                await user.save();
        
                // Return a success message or the updated user, based on your API design
                return "Password successfully changed";
            } catch (error) {
                // Handle or log the error
                throw new Error("Failed to change password");
            }
        },
    }
}