import { MongoDataSource } from 'apollo-datasource-mongodb';

export default class Users extends MongoDataSource {
    async getUsers(){
        return await this.model.find();
    }

    async getUser(id){
        return await this.model.findOne({email:id.email});
    }

    async createUser({email,username,password}){
        return await this.model.create({email,username,password});
    }
    
    async deleteUser(id){
        return await this.model.deleteOne(id);
    }

    // async login(mail, password){
    //     //check if user exists
    //     let username = nameEmail;
    //     const nameEmail = await this.model.findOne({email:mail});
    //     const nameUser = await this.model.findOne({user:mail});
 
    //     if (!nameEmail && !nameUser) {
    //         throw new Error ("No User found");
    //     }

    //     if (!nameEmail && nameUser) {
    //         username = nameUser;
    //     }
    //     //check if password matches
    //     const isValid = await bcrypt.compare(password, username.password);
    //     if (!isValid){
    //         throw new Error ("The username/email or password is incorrect.");
    //     }

    //     //sign in user, and if users exists then create a token for them
    //     const token = await jwt.sign (
    //         {
    //             user:username
    //         },
    //         SECRET,
    //         {expiresIn:"1d"}
    //     );
    //     return token;
    // }
}