import { MongoDataSource } from 'apollo-datasource-mongodb';

export default class Users extends MongoDataSource {
    constructor(options){
        super(options);
        this.initialize({ cache: options.cache, context: options.context });
    }

    async getUsers(){
        return await this.model.find();
    }

    async getUser(id) {
        try {
            const user = await this.model.findOne({ email: id.email });
            if (!user) {
                throw new Error('User not found');
            }
            return user;
        } catch (error) {
            // Handle or log the error as appropriate
            throw new Error('Error fetching user');
        }
    }

    async createUser({email,username,password}){
        try{
            if (!email || !username || !password) {
                throw new Error('Missing required fields');
            }
            return await this.model.create({email,username,password});
        } catch (error) {
            if (error.code === 11000) { //MongoDB duplicate key error code
                throw new Error('Email or username already exists');
            }else{
                throw new Error('Error creating user'); //maybe add specific message?
            }
        }

    }
    
    async deleteUser(id){
        return await this.model.deleteOne(id);
    }
}

//need to fix initialize line, and add more options to handle error handling here.