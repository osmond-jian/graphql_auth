import { DataSource } from 'apollo-datasource';

export default class Neo4jDataSource extends DataSource {
    constructor(driver) {
        super();
        this.driver = driver;
    }

    initialize(config) {
        this.context = config.context;
    }

    // A simple function for testing purposes
    async testConnection() {
        const session = this.driver.session();
        try {
            // Perform a simple read operation that doesn't depend on data
            const result = await session.run('RETURN "Connection successful" AS message');
            return result.records[0].get('message');
        } catch (error) {
            // Handle errors appropriately
            console.error('Error testing Neo4j connection:', error);
            throw new Error('Error testing Neo4j connection');
        } finally {
            session.close();
        }
    }

    //other methods
    async createSurvey({ title }) {
        const session = this.driver.session();
        try {
            const result = await session.run(
                'CREATE (s:Survey {title: $title}) RETURN s',
                { title }
            );
            return result.records[0].get('s').properties;
        } catch (error) {
            console.error('Error creating survey:', error);
            throw new Error('Error creating survey');
        } finally {
            session.close();
        }
    }

    async createQuestion({ surveyId, questionId, text }) {
        const session = this.driver.session();
        try {
            await session.run(
                `MATCH (s:Survey {id: $surveyId})
                 CREATE (q:Question {id: $questionId, text: $text})
                 MERGE (s)-[:HAS_QUESTION]->(q)`,
                { surveyId, questionId, text }
            );
        } finally {
            session.close();
        }
    }

    async removeQuestion({ questionId }) {
        const session = this.driver.session();
        try {
            await session.run(
                `MATCH (q:Question {id: $questionId})
                 DETACH DELETE q`,
                { questionId }
            );
        } finally {
            session.close();
        }
    }

    async createAnswer({ questionId, answerId, text }) {
        const session = this.driver.session();
        try {
            await session.run(
                `MATCH (q:Question {id: $questionId})
                 CREATE (a:Answer {id: $answerId, text: $text})
                 MERGE (q)-[:HAS_ANSWER]->(a)`,
                { questionId, answerId, text }
            );
        } finally {
            session.close();
        }
    }

    async removeAnswer({ answerId }) {
        const session = this.driver.session();
        try {
            await session.run(
                `MATCH (a:Answer {id: $answerId})
                 DETACH DELETE a`,
                { answerId }
            );
        } finally {
            session.close();
        }
    }
    
    
    
    

    //experimental complex method for creating a full survey
    async createFullSurvey({ id, title, questions }) {
        const session = this.driver.session();
        const transaction = session.beginTransaction();
        try {
            // Create the survey
            await transaction.run(
                'CREATE (s:Survey {id: $id, title: $title}) RETURN s',
                { id, title }
            );

            // For each question, create the question and link it to the survey
            for (const question of questions) {
                await transaction.run(
                    `MATCH (s:Survey {id: $surveyId})
                     CREATE (q:Question {id: $questionId, text: $questionText})
                     MERGE (s)-[:HAS_QUESTION]->(q)`,
                    { surveyId: id, questionId: question.id, questionText: question.text }
                );

                // If there are answers, create them and link to the question
                if (question.answers && question.answers.length) {
                    for (const answer of question.answers) {
                        await transaction.run(
                            `MATCH (q:Question {id: $questionId})
                             CREATE (a:Answer {text: $answerText})
                             MERGE (q)-[:HAS_ANSWER]->(a)`,
                            { questionId: question.id, answerText: answer.text }
                        );
                    }
                }
            }

            // Commit the transaction
            await transaction.commit();
        } catch (error) {
            console.error('Error creating full survey:', error);
            await transaction.rollback();
            throw new Error('Error creating full survey');
        } finally {
            session.close();
        }
    }

}