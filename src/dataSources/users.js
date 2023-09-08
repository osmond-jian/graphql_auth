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
}