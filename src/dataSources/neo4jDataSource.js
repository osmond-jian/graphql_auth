import { DataSource } from 'apollo-datasource';

export default class Neo4jDataSource extends DataSource {
    constructor(driver) {
        super();
        this.driver = driver;
    }

    initialize(config) {
        this.context = config.context;
    }

//QUERIES
    //gets one survey with all question nodes using surveyId   
    async getSurvey(surveyId) {
        const session = this.driver.session();
        try {
            // Match entire survey tree with 3 depth
            const result = await session.run(
                `MATCH (s:Survey {id: $surveyId})
                OPTIONAL MATCH (s)-[:FIRST_QUESTION]->(firstQ:Question)
                OPTIONAL MATCH (firstQ)-[:NEXT*0..]->(q:Question)
                OPTIONAL MATCH (q)<-[:IS_OPTION_OF]-(o:Option)
                WITH s, firstQ, q, COLLECT(o) AS options
                RETURN s AS survey, COLLECT(DISTINCT {question: q, options: options}) AS questions                                                   
                `,
                { surveyId }
            );
            
            if (result.records.length > 0) {
                const surveyNode = result.records[0].get('survey');
                const survey = surveyNode.properties;
                // Assuming questions are returned as {question: Question, options: [Option]}
                const questionWithOptions = result.records[0].get('questions').filter(q => q != null && q.question);
            
                const questions = questionWithOptions.map(qw => {
                    const question = qw.question.properties;
                    const options = qw.options.filter(opt => opt != null).map(opt => opt.properties);
                    return {
                        ...question,
                        options: options
                    };
                });
                console.log({...survey,questions});
                return { ...survey, questions };
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

    //use this to test changes with the getSurvey() function
    //maybe easier with APOC like this but cant get APOC to work currently on Aura Free : CALL apoc.path.spanningTrees(s,{labelFilter:'Survey|Question|Option', maxLevel:3}) YIELD path
    // async getEntireSurvey(surveyId) {
    //     const session = this.driver.session();
    //     try {
    //         // Match entire survey tree with 3 depth
    //         const result = await session.run(
    //             `MATCH (s:Survey {id: $surveyId})
    //             OPTIONAL MATCH (s)-[:FIRST_QUESTION]->(firstQ:Question)
    //             OPTIONAL MATCH (firstQ)-[:NEXT*0..]->(q:Question)
    //             OPTIONAL MATCH (q)<-[:IS_OPTION_OF]-(o:Option)
    //             WITH s, firstQ, q, COLLECT(o) AS options
    //             RETURN s AS survey, COLLECT(DISTINCT {question: q, options: options}) AS questions                                                   
    //             `,
    //             { surveyId }
    //         );
            
    //         if (result.records.length > 0) {
    //             const surveyNode = result.records[0].get('survey');
    //             const survey = surveyNode.properties;
    //             // Assuming questions are returned as {question: Question, options: [Option]}
    //             const questionWithOptions = result.records[0].get('questions').filter(q => q != null && q.question);
            
    //             const questions = questionWithOptions.map(qw => {
    //                 const question = qw.question.properties;
    //                 const options = qw.options.filter(opt => opt != null).map(opt => opt.properties);
    //                 return {
    //                     ...question,
    //                     options: options
    //                 };
    //             });
    //             console.log({...survey,questions});
    //             return { ...survey, questions };
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

    //get an array of all surveys without question nodes
    async getAllSurveys() {
        const session = this.driver.session();
        try {
            const result = await session.run(
                `MATCH (s:Survey)
                RETURN s.id AS id, s.title AS title`
            );

            // Convert the result records into a JavaScript array of objects
            const surveys = result.records.map(record => {
                return {
                    id: record.get('id'),
                    title: record.get('title')
                };
            });

            return surveys;
        } catch (error) {
            console.error('Error fetching surveys:', error);
            throw new Error('Error fetching surveys');
        } finally {
            session.close();
        }
    }

    async getQuestionOptions(questionId) {
        const session = this.driver.session();
        try {
            // Match the question by ID and then find all related options
            const result = await session.run(
                `MATCH (q:Question {id: $questionId})
                 OPTIONAL MATCH (q)<-[:IS_OPTION_OF]-(o:Option)
                 RETURN q AS question, collect(o) AS options`,
                { questionId }
            );
    
            let options = [];
            if (result.records.length > 0) {
                const questionNode = result.records[0].get('question');
                const question = questionNode.properties;
                // Assuming options are returned as a list of nodes
                options = result.records[0].get('options').map(optionNode => optionNode.properties);
    
                return { ...question, options };
            } else {
                return null; // or throw an error if question not found
            }
        } catch (error) {
            console.error('Error fetching question options:', error);
            throw new Error('Error fetching question options');
        } finally {
            session.close();
        }
    }
    

//MUTATIONS
    //creates a Survey node with a generated id and a title (string)
    async createSurvey({ title }) {

        const session = this.driver.session();
        try {
            //note this uses the APOC package in neo4j to generate a unique UUID. The odds of generating a duplicate UUID is astronomically low but not 0. IF need be, we can implement logic to check the database first
            const result = await session.run(
                'CREATE (s:Survey {id: apoc.create.uuid(), title: $title}) RETURN s',
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

    //create a question node on an existing survey node
    //if scaled up and there is a risk of multiple modifications at the same time, we need to implement a locking/transactional control mechanism    
    async createQuestion({ surveyId, text, type, options }) {
        // console.log(surveyId, text, type, options);
        const session = this.driver.session();
        try {
            const result = await session.run(
                `MATCH (s:Survey {id: $surveyId})
                OPTIONAL MATCH (s)-[fq:FIRST_QUESTION]->(firstQ)
                OPTIONAL MATCH (s)-[lq:LAST_QUESTION]->(lastQn)
                WITH s, fq, firstQ, lq, lastQn
                CREATE (q:Question {text: $text, type: $type, id: randomUUID()})
                MERGE (s)-[:HAS_QUESTION]->(q)
                WITH s, q, fq, lq, lastQn
                FOREACH(_ IN CASE WHEN fq IS NULL THEN [1] ELSE [] END |
                    MERGE (s)-[:FIRST_QUESTION]->(q)
                )
                WITH s, q, fq, lq, lastQn // Include fq again to ensure it's available for the next condition
                // Conditionally set q as the last question directly, applicable for first or subsequent questions
                FOREACH(_ IN CASE WHEN lq IS NOT NULL OR fq IS NULL THEN [1] ELSE [] END |
                    MERGE (s)-[:LAST_QUESTION]->(q)
                )
                // Link the new question to the last if it existed
                WITH s, q, lq, lastQn // No need for fq here as it's not used in this condition
                FOREACH(_ IN CASE WHEN lastQn IS NOT NULL THEN [1] ELSE [] END |
                    MERGE (lastQn)-[:NEXT]->(q)
                )
                // Optionally, remove the old LAST_QUESTION relationship if not needed anymore
                WITH s, q, lq, lastQn // Re-including lq for clarity, though it's already available
                FOREACH(_ IN CASE WHEN lq IS NOT NULL THEN [1] ELSE [] END |
                    DELETE lq
                )
                RETURN s AS survey, q AS newQ                               
                `,
                { surveyId, text, type }
            );
            
            if (result.records.length > 0) {
                const newQuestion = result.records[0].get('newQ').properties;
                const questionId = newQuestion.id;
    
                // If type is "multiple-choice" and there are options to add
                if (type === 'multiple-choice' && options && options.length > 0) {
                    for (let optionText of options) {
                        // Add each option to the question
                        await session.run(
                            `MATCH (q:Question {id: $questionId})
                            CREATE (o:Option {text: $optionText})-[:IS_OPTION_OF]->(q)`,
                            { questionId, optionText }
                        );
                    }
                }
                return newQuestion;
            } else {
                throw new Error('Question creation failed or survey does not exist');
            }
        } catch (error) {
            console.error('Error creating question:', error);
            throw new Error('Error creating question');
        } finally {
            session.close();
        }
    }

    //modifies an existing question
    //validate text/type? also is having surveyID redundant? Are all questionIds unique across surveys?
    async editQuestion({ surveyId, questionId, text, type, options }) {
        const session = this.driver.session();
        try {
            // Match the question within the context of its survey
            const result = await session.run(
                `MATCH (s:Survey {id: $surveyId})-[:HAS_QUESTION]->(q:Question {id: $questionId})
                 SET q.text = $text, q.type = $type
                 RETURN q`,
                { surveyId, questionId, text, type }
            );
    
            if (result.records.length > 0) {
                const newQuestion = result.records[0].get('newQ').properties;
    
                // If type is "multiple-choice" and there are options to add
                if (type === 'multiple-choice' && options && options.length > 0) {
                    for (let optionText of options) {
                        // Add each option to the question
                        await session.run(
                            `MATCH (q:Question {id: $questionId})
                            CREATE (o:Option {text: $optionText})-[:IS_OPTION_OF]->(q)`,
                            { questionId, optionText }
                        );
                    }
                }
                return newQuestion;
            } else {
                // If no question was found within the specified survey, handle appropriately
                throw new Error('Question not found within the specified survey or update failed');
            }
        } catch (error) {
            console.error('Error editing question:', error);
            throw new Error('Error editing question');
        } finally {
            session.close();
        }
    }
    
    //removes a question node from an existing survey node given a questionId
    async removeQuestion({ questionId }) {
        // Match the question to be deleted and its successor
            // Optionally match the predecessor of the question to be deleted
            // Delete the NEXT relationship from the predecessor to the question
            // Create a new NEXT relationship from the predecessor directly to the successor
            // Finally, delete the question and its outgoing NEXT relationship
        const session = this.driver.session();
        try {
            await session.run(
                `MATCH (q:Question {id: $questionId})
                OPTIONAL MATCH (q)<<-[optionRel:IS_OPTION_OF]-(option:Option)
                WITH q, collect(option) AS options
                
                // Delete options related to the question
                FOREACH (option IN options | DETACH DELETE option)

                WITH q                
                OPTIONAL MATCH (prevQ:Question)-[prevRel:NEXT]->(q)
                OPTIONAL MATCH (q)-[nextRel:NEXT]->(nextQ:Question)
                OPTIONAL MATCH (s:Survey)-[sqRel:HAS_QUESTION]->(q)
                WITH q, s, prevQ, nextQ
                
                OPTIONAL MATCH (s)-[firstRel:FIRST_QUESTION]->(q)
                OPTIONAL MATCH (s)-[lastRel:LAST_QUESTION]->(q)
                WITH q, s, prevQ, nextQ, firstRel, lastRel
                
                // Use FOREACH to conditionally handle the re-linking of prevQ and nextQ
                FOREACH (_ IN CASE WHEN prevQ IS NOT NULL AND nextQ IS NOT NULL THEN [1] ELSE [] END | 
                    MERGE (prevQ)-[:NEXT]->(nextQ))
                
                // Conditionally remove and reassign FIRST_QUESTION and LAST_QUESTION relationships
                FOREACH (_ IN CASE WHEN firstRel IS NOT NULL AND lastRel IS NULL AND nextQ IS NOT NULL THEN [1] ELSE [] END | 
                    DELETE firstRel
                    MERGE (s)-[:FIRST_QUESTION]->(nextQ))
                
                FOREACH (_ IN CASE WHEN lastRel IS NOT NULL AND firstRel IS NULL AND prevQ IS NOT NULL THEN [1] ELSE [] END | 
                    DELETE lastRel
                    MERGE (s)-[:LAST_QUESTION]->(prevQ))
                
                // Finally, delete the question node itself
                WITH q
                DETACH DELETE q                                                                                                                                                                             
                `,
                { questionId }
            );
        } catch (error) {
            console.error('Error removing question:', error);
            throw new Error('Error removing question');
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