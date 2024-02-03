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

    //queries
    async getSurvey(surveyId) {
        const session = this.driver.session();
        try {
            const result = await session.run(
                `MATCH (s:Survey {id: $surveyId})
                OPTIONAL MATCH (s)-[:HAS_QUESTION]->(q:Question)
                RETURN s, collect(q) as questions`,
                { surveyId }
            );
    
            if (result.records.length > 0) {
                const survey = result.records[0].get('survey').properties;
                const questionsWithAnswers = result.records[0].get('questionsWithAnswers').map(item => {
                    return {
                        ...item.question.properties,
                        answers: item.answers.map(a => a.properties)
                    };
                });
                return { ...survey, questions: questionsWithAnswers };
            } else {
                return null; // or throw an error if survey not found
            }
        } catch (error) {
            console.error('Error fetching survey:', error);
            throw new Error('Error fetching survey');
        } finally {
            session.close();
        }
    }

    // async getSurveyWithAnswers(surveyId) {
    //     const session = this.driver.session();
    //     try {
    //         const result = await session.run(
    //             `MATCH (s:Survey {id: $surveyId})
    //              OPTIONAL MATCH (s)-[:HAS_QUESTION]->(q:Question)
    //              OPTIONAL MATCH (q)-[:HAS_ANSWER]->(a:Answer)
    //              RETURN s AS survey, 
    //                     collect({question: q, answers: collect(a)}) AS questionsWithAnswers`,
    //             { surveyId }
    //         );
    
    //         if (result.records.length > 0) {
    //             const survey = result.records[0].get('survey').properties;
    //             const questionsWithAnswers = result.records[0].get('questionsWithAnswers').map(item => {
    //                 return {
    //                     ...item.question.properties,
    //                     answers: item.answers.map(a => a.properties)
    //                 };
    //             });
    //             return { ...survey, questions: questionsWithAnswers };
    //         } else {
    //             return null; // or throw an error if survey not found
    //         }
    //     } catch (error) {
    //         console.error('Error fetching survey:', error);
    //         throw new Error('Error fetching survey');
    //     } finally {
    //         session.close();
    //     }
    // }

    //other methods
    async createSurvey({ id, title }) {
        const session = this.driver.session();
        try {
            const result = await session.run(
                'CREATE (s:Survey {id: $id, title: $title}) RETURN s',
                { id, title }
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
        //consider adding other properties, such as priority
        const session = this.driver.session();
        try {
            const result = await session.run(
                `MATCH (s:Survey {id: $surveyId})
                 CREATE (q:Question {id: $questionId, text: $text})
                 MERGE (s)-[:HAS_QUESTION]->(q)
                 RETURN q`, // Return the newly created question node
                { surveyId, questionId, text }
            );
    
            // Assuming at least one record will be returned
            if (result.records.length > 0) {
                return result.records[0].get('q').properties;
            } else {
                throw new Error('Question creation failed');
            }
        } catch (error) {
            console.error('Error creating question:', error);
            throw new Error('Error creating question');
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
    async createAnswer({ questionId, answerId, text, userId }) {
        //consider adding additional properties, such as score (for weighted answers)
        const session = this.driver.session();
        try {
            const result = await session.run(
                `MATCH (q:Question {id: $questionId})
                 MATCH (u:User {id: $userId})
                 CREATE (a:Answer {id: $answerId, text: $text})
                 MERGE (q)-[:HAS_ANSWER]->(a)
                 MERGE (a)-[:ANSWERED_BY]->(u)
                 RETURN a`,
                { questionId, answerId, text, userId }
            );
    
            if (result.records.length > 0) {
                return result.records[0].get('a').properties;
            } else {
                throw new Error('Answer creation failed');
            }
        } catch (error) {
            console.error('Error creating answer:', error);
            throw new Error('Error creating answer');
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